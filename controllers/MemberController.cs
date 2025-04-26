using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MyGym_Backend.DTO;
using MyGym_Backend.Modals;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt; 

namespace MyGym_Backend.Controllers
{
    [Authorize(Roles = "Member")]
    [ApiController]
    [Route("api/[controller]")]
    public class MemberController : ControllerBase
    {
        private readonly IMemberRepo _memberRepo;

        public MemberController(IMemberRepo memberRepo)
        {
            _memberRepo = memberRepo;
        }

        private string? GetCurrentUserId()
        {
            // Return the first ClaimTypes.NameIdentifier that is a valid GUID
            return User.Claims
                .Where(c => c.Type == ClaimTypes.NameIdentifier)
                .Select(c => c.Value)
                .FirstOrDefault(v => Guid.TryParse(v, out _));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MemberResponseDto>> GetMember(int id)
        {
            var member = await _memberRepo.GetMemberAsync(id);
            if (member == null)
                return NotFound();

            var userId = GetCurrentUserId();
            foreach (var claim in User.Claims)
            {
                Console.WriteLine($"{claim.Type}: {claim.Value}");
            }
            Console.WriteLine($"UserId: {userId}");
            Console.WriteLine($"MemberId: {member.ApplicationUserId}");
            if (member.ApplicationUserId != userId)
                return Forbid();

            return Ok(member);
        }

        [HttpGet("plans")]
        public async Task<ActionResult<IEnumerable<Plan>>> GetPlans()
        {
            var plans = await _memberRepo.GetAllPlansAsync();
            return Ok(plans);
        }

        [HttpGet("trainers")]
        public async Task<ActionResult<IEnumerable<Trainer>>> GetTrainers()
        {
            var trainers = await _memberRepo.GetAllTrainersAsync();
            return Ok(trainers);
        }

        [HttpPut("{id}/renew")]
        public async Task<IActionResult> Renew(int id, [FromBody] RenewMemberDto renewDto)
        {
            var member = await _memberRepo.GetMemberAsync(id);
            if (member == null)
                return NotFound();

            var userId = GetCurrentUserId();
            if (member.ApplicationUserId != userId)
                return Forbid();

            var (error, payment) = await _memberRepo.RenewMemberAsync(id, renewDto);
            if (error == "NotFound")
                return NotFound();
            if (error == "NoRenewNeeded")
                return BadRequest("Member does not need to renew.");
            if (error == "PlanNotFound")
                return NotFound("New plan not found.");
            return Ok(new { Message = "Member renewed successfully", payment });
        }

        [HttpPut("{id}/freeze")]
        public async Task<IActionResult> Freeze(int id, [FromBody] int frozenDuration)
        {
            var member = await _memberRepo.GetMemberAsync(id);
            if (member == null)
                return NotFound();

            var userId = GetCurrentUserId();
            if (member.ApplicationUserId != userId)
                return Forbid();

            var result = await _memberRepo.FreezeMemberAsync(id, frozenDuration);
            if (result == "NotFound")
                return NotFound();
            if (result == "AlreadyFrozen")
                return BadRequest("Member is already frozen.");
            if (result == "NoFrozenDuration")
                return BadRequest("Frozen duration is not set.");
            if (result == "InvalidFreeze")
                return BadRequest("Cannot freeze for more than 1/3 of the plan duration or sessional plans");
            if (result == "Inactive")
                return BadRequest("Member is already inactive and cannot be frozen.");
            return NoContent();
        }

        [HttpPut("{id}/unfreeze")]
        public async Task<IActionResult> Unfreeze(int id)
        {
            var member = await _memberRepo.GetMemberAsync(id);
            if (member == null)
                return NotFound();

            var userId = GetCurrentUserId();
            if (member.ApplicationUserId != userId)
                return Forbid();

            var result = await _memberRepo.UnfreezeMemberAsync(id);
            if (result == "NotFound")
                return NotFound();
            if (result == "NotFrozen")
                return BadRequest("Member is not frozen.");
            if (result == "Inactive")
                return BadRequest("Member is already inactive and cannot be reactivated.");
            return NoContent();
        }
    }
}