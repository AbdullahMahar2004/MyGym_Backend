using System.Collections.Generic;
using System.Threading.Tasks;
using MyGym_Backend.Modals;

public interface INotificationService
{
    Task SendNotificationAsync(string applicationUserId, string content);
    Task<List<Notification>> GetNotificationsAsync(string applicationUserId);
    Task MarkAsReadAsync(int notificationId);
}