using System.ComponentModel.DataAnnotations;

namespace MyGym_Backend.Modals
{
    public class Trainer
    {
        [Key]
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string PhoneNumber { get; set; }

        public required string Specialization { get; set; } 

        public List<Member>? Members { get; set; }
    }
}