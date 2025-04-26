

using System.ComponentModel.DataAnnotations.Schema;

namespace MyGym_Backend.Modals
{
    public class Notification
    {
        public int Id { get; set; }
        
        public required string Content { get; set; }

        public required bool IsRead { get; set; }

        public required DateTime CreatedAt { get; set; }
        [ForeignKey("ApplicationUser")]
        public required string ApplicationUserId { get; set; }
        public ApplicationUser? ApplicationUser { get; set; }

    }
}