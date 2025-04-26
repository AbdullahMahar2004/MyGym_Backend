namespace MyGym_Backend.DTO
{
    public class RegisterDTO
    {
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string ConfirmPassword { get; set; }
        public required string UserName { get; set; }

        public int Code { get; set; } 
    }
}