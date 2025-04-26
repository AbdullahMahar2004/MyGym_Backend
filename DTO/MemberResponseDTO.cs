using MyGym_Backend.Modals;

namespace MyGym_Backend.DTO
{
    public class MemberResponseDto
    {
        public int? Id { get; set; } 
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Name { get; set; }
        public string? TrainerName { get; set; }
        public string? PlanName { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? ApplicationUserName {get; set; }
        public int SessionCount { get; set; }
        public string ?MaxSessions {get; set; } 
        public string? ApplicationUserId { get; set; } 
        public bool IsActive { get; set; }
        
        public bool IsFrozen { get; set; } = false; 

        public DateTime? FreezeStartDate { get; set; }
        public DateTime? FreezeEndDate { get; set; }
        public int? FrozenDuration { get; set; } 

        
    }
}