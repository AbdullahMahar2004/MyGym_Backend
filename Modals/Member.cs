using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Security.Cryptography.X509Certificates;

namespace MyGym_Backend.Modals
{
    public class Member
    {
        [Key]
        public int Id { get; set; }
        [ForeignKey("ApplicationUser")]
        public string? ApplicationUserId { get; set; } 
        public ApplicationUser? ApplicationUser { get; set; } 
        public required string Name { get; set; }
        public required string Email { get; set; }
        public required string PhoneNumber { get; set; }

        public required DateTime StartDate { get; set; }
        
        [ForeignKey("Plan")]
        public int PlanId { get; set; }
        public required Plan Plan { get; set; }

        public required DateTime EndDate { get; set; }
        

        [ForeignKey("Trainer")]
        public int? TrainerId { get; set; }
        public Trainer? Trainer { get; set; }

        public int SessionCount { get; set; }

        public int MaxSessions
        {
            get
            {
                return Plan != null ? Plan.NumberOfSessions : 0;
            }
        }

        public bool IsActive {
            get
            {
                if (Plan != null && Plan.IsSessional == true)
                {
                    return SessionCount < MaxSessions;
                }
                else if (Plan != null && Plan.IsSessional == false)
                {
                    return EndDate > DateTime.Now;
                }
                return false;
            }
        }
        public bool IsFrozen
        {
            get
            {
                if (FreezeStartDate != null && FreezeEndDate != null)
                {
                    return DateTime.Now >= FreezeStartDate && DateTime.Now <= FreezeEndDate;
                }
                return false;
            }
        }

        public DateTime? FreezeStartDate { get; set; } 
        public DateTime? FreezeEndDate { get; set; } 
        public int? FrozenDuration { get; set; } 
    }
}
