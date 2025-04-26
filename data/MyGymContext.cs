using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using MyGym_Backend.Modals;
namespace MyGym_Backend.Data
{
    public class MyGymContext : IdentityDbContext<ApplicationUser>
    {
        public MyGymContext(DbContextOptions<MyGymContext> options) : base(options){}
        
        public DbSet<Member> Members { get; set; } = null!;
        public DbSet<Trainer> Trainers { get; set; } = null!;
        public DbSet<Plan> Plans { get; set; } = null!;

        public DbSet<Notification> Notifications { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
                            
            modelBuilder.Entity<Member>()
                .HasOne(m => m.Plan)
                .WithMany()
                .HasForeignKey(m => m.PlanId)
                .OnDelete(DeleteBehavior.NoAction);
            modelBuilder.Entity<Member>()
                .HasOne(m => m.Trainer)
                .WithMany()
                .HasForeignKey(m => m.TrainerId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Member>()
                .HasOne(m => m.ApplicationUser)
                .WithOne()
                .HasForeignKey<Member>(m => m.ApplicationUserId);
            modelBuilder.Entity<Trainer>()
                .HasMany(t => t.Members)
                .WithOne(m => m.Trainer)
                .HasForeignKey(m => m.TrainerId)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Plan>()
                .HasMany(p => p.Members)
                .WithOne(m => m.Plan)
                .HasForeignKey(m => m.PlanId)
                .OnDelete(DeleteBehavior.SetNull); 
            modelBuilder.Entity<Notification>()
                .HasOne(n => n.ApplicationUser)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.ApplicationUserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}