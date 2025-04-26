using MyGym_Backend.Data;
using MyGym_Backend.Modals;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace MyGym_Backend.Services
{
    public class NotificationService :BackgroundService, INotificationService
    {
        private readonly MyGymContext _context;
        private readonly IServiceProvider _serviceProvider;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(24);

        public NotificationService(MyGymContext context, IServiceProvider serviceProvider)
        {
            _context = context;
            _serviceProvider = serviceProvider;
        }
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await CheckInactiveUsersAndNotifyAsync();

                await Task.Delay(_checkInterval, stoppingToken);
            }
        }
        private async Task CheckInactiveUsersAndNotifyAsync()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var _notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

                var members = await _context.Members
                            .Include(m => m.Plan)
                            .Include(m => m.Trainer)
                            .Include(m => m.ApplicationUser)
                            .ToListAsync();
                var inactiveUsers = members.Where(m => m.IsActive && m.ApplicationUserId!=null).ToList();
                foreach (var user in inactiveUsers)
                {
                    if (!string.IsNullOrEmpty(user.ApplicationUserId))
                    {
                        await _notificationService.SendNotificationAsync(user.ApplicationUserId, "Your Plan Has Expired. Please renew to continue enjoying our Gym.");
                    }
                }

                await _context.SaveChangesAsync();
            }
        }
        public async Task SendNotificationAsync(string applicationUserId, string content)
        {
            var notification = new Notification
            {
                ApplicationUserId = applicationUserId,
                Content = content,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            var user = await _context.Users.FindAsync(applicationUserId);
            if (user != null)
            {
                user.NotificationCount += 1;
            }
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
        }
        public async Task<List<Notification>> GetNotificationsAsync(string applicationUserId)
        {
            return await _context.Notifications
                .Where(n => n.ApplicationUserId == applicationUserId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }
        public async Task MarkAsReadAsync(int notificationId)
        {
            var notification = await _context.Notifications.FindAsync(notificationId);
            if (notification != null)
            {
                notification.IsRead = true;
                await _context.SaveChangesAsync();
            }
        }
    }
}