namespace MyGym_Backend.DTO
{
    public class MemberDto
    {
        public required string Email { get; set; }
        public required string PhoneNumber { get; set; }
        public required string Name { get; set; }
        public required int PlanId { get; set; }
        public int? TrainerId { get; set; }
        
    }
}