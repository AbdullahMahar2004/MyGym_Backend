using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MyGym_Backend.Data;
using MyGym_Backend.Modals;
using System.Security.Claims;
using MyGym_Backend.Services;

var builder = WebApplication.CreateBuilder(args);



// Database
builder.Services.AddDbContext<MyGymContext>(options =>
    options.UseSqlite("Data Source=MyGym.db"));

// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<MyGymContext>()
    .AddDefaultTokenProviders();

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = builder.Configuration["Jwt:Key"] 
    ?? throw new InvalidOperationException("JWT Key is not configured.");
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true
    };

});
// --- configure Services
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddScoped<IMemberRepo, MemberRepo>();
builder.Services.AddScoped<INotificationService, NotificationService>();

var app = builder.Build();

// --- Configure Middleware ---
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
app.UseAuthorization();

app.MapControllers();
app.MapGet("/", () => "Welcome to MyGym API!").WithName("Home");

// --- Seed Data ---
using (var scope = app.Services.CreateScope())
{
    await SeedData.SeedAdminUserAsync(scope.ServiceProvider);
}

app.Run();