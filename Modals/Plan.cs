using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyGym_Backend.Modals
{
    public class Plan
    {
        [Key]
        public int Id { get; set; }
        public required string Name { get; set; } // Name of the plan
        public bool IsSessional { get; set; } // Indicates if the plan is sessional or not
        public int NumberOfSessions { get; set; } // Number of sessions in the plan
        public int Duration { get; set; } // Duration of the plan
        public decimal Price { get; set; } // Price in currency (e.g., USD)

        // Foreign key for Members
        public List<Member>? Members { get; set; } // List of members associated with this plan
    }
}
