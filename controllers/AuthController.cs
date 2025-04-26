using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyGym_Backend.Data;
using MyGym_Backend.Modals;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MyGym_Backend.DTO;
using MyGym_Backend.Services;
using SQLitePCL;
namespace MyGym_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _configuration;
        private readonly MyGymContext _context;
        private readonly INotificationService _notificationService;
        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration configuration,
            MyGymContext context,
            INotificationService notificationService)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
            _context = context;
            _notificationService = notificationService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDTO model)
        {
            if (model.Password != model.ConfirmPassword)
                return BadRequest("Password and Confirm Password do not match");

            if (await _context.Members.FirstOrDefaultAsync(m => m.Email == model.Email) == null)
                return BadRequest("You need to register your email at the gym first");

            if (await _userManager.FindByNameAsync(model.UserName) != null)
                return BadRequest("User already exists with this username");

            if (string.IsNullOrEmpty(model.UserName) || string.IsNullOrEmpty(model.Email) || string.IsNullOrEmpty(model.Password))
                return BadRequest("All fields are required");

            // Generate and send verification code
            var code = GenerateVerificationCode();
            // Save code to DB or cache, associated with email
            await SaveVerificationCode(model.Email, code);
            // Send code to user's email (implement this)
            await SendVerificationEmail(model.Email, code);

            return Ok(new { model,Message = "Verification code sent to your email." });
        }

        [HttpPost("verify")]
        public async Task<IActionResult> Verify([FromBody] RegisterDTO model)
        {
            // model: same register model + Code
            if (!await CheckVerificationCode(model.Email, model.Code))
                return BadRequest("Invalid verification code");

            var user = new ApplicationUser { UserName = model.UserName, Email = model.Email };
            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                await _userManager.AddToRoleAsync(user, "Member");
                var member = await _context.Members.FirstOrDefaultAsync(m => m.Email == model.Email);
                if (member != null)
                {
                    member.ApplicationUserId = user.Id;
                    _context.Members.Update(member);
                    await _context.SaveChangesAsync();
                    await _notificationService.SendNotificationAsync(user.Id, "Welcome to MyGym! Your account has been created successfully.");
                    return Ok(new { Message = "User registered successfully", UserId = user.Id });
    
                }
                return BadRequest(new { Message = "Member not found" });
            }

            return BadRequest(new { Message = "User registration failed", Errors = result.Errors });
        }
        private static readonly Dictionary<string, (int Code, DateTime Expiry)> _verificationCodes = new();

        private async Task SaveVerificationCode(string email, int code)
        {
            // Store code with 10-minute expiry
            _verificationCodes[email] = (code, DateTime.UtcNow.AddMinutes(10));
            await Task.CompletedTask;
        }

        private async Task SendVerificationEmail(string email, int code)
        {
            //since this is a local project, verification code is printed in terminal, no need toimplement SMTP.
            Console.WriteLine($"Send email to {email} with verification code: {code}");
            await Task.CompletedTask;
        }

        private Task<bool> CheckVerificationCode(string email, int code)
        {
            if (_verificationCodes.TryGetValue(email, out var entry))
            {
                if (entry.Code == code && entry.Expiry > DateTime.UtcNow)
                {
                    _verificationCodes.Remove(email); // Remove after successful verification
                    return Task.FromResult(true);
                }
            }
            return Task.FromResult(false);
        }

        private int GenerateVerificationCode()
        {
            return new Random().Next(1000, 9999);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDTO model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null || !await _userManager.CheckPasswordAsync(user, model.Password))
                return Unauthorized("Email or Password are incorrect");

            var token = await GenerateJwtToken(user);
            var member = await _context.Members.FirstOrDefaultAsync(m => m.ApplicationUserId == user.Id);
            if (member == null)
                return Ok(token);
            return Ok(new {token,member.Id});
        }

        private async Task<string> GenerateJwtToken(ApplicationUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Email ?? string.Empty),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
            };
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration["Jwt:Key"] !));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}