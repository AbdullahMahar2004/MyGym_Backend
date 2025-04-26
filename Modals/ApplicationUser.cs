using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace MyGym_Backend.Modals
{
    public class ApplicationUser : IdentityUser
    {
        public int NotificationCount { get; set; } = 0;
        public List<Notification>? Notifications { get; set; }
    }
}