using Microsoft.EntityFrameworkCore;
using MyGym_Backend.Data;
using MyGym_Backend.Modals;
using MyGym_Backend.DTO;

public class MemberRepo : IMemberRepo
{
    private readonly MyGymContext _context;
    private readonly INotificationService _notificationService;

    public MemberRepo(MyGymContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<List<MemberResponseDto>> GetMembersAsync()
    {
        var members = await _context.Members
            .Include(m => m.Plan)
            .Include(m => m.Trainer)
            .Include(m => m.ApplicationUser)
            .ToListAsync();

        return members.Select(m => new MemberResponseDto
        {
            Name = m.Name,
            Email = m.Email,
            PhoneNumber = m.PhoneNumber,
            TrainerName = m.Trainer != null ? m.Trainer.Name : "No Trainer Assigned",
            PlanName = m.Plan != null
                ? m.Plan.Name + (m.Trainer != null ? (" " + m.Trainer.Name) : " (No Trainer Assigned)")
                : "No Plan Assigned",
            StartDate = m.StartDate,
            EndDate = m.EndDate,
            ApplicationUserName = m.ApplicationUser != null ? m.ApplicationUser.UserName : "No Application User Assigned",
            SessionCount = m.SessionCount,
            MaxSessions = m.Plan != null
                ? (m.Plan.NumberOfSessions == -1 ? "Unlimited" : m.Plan.NumberOfSessions.ToString())
                : "N/A",
            IsActive = m.IsActive,
            IsFrozen = m.IsFrozen,
            FreezeStartDate = m.FreezeStartDate,
            FreezeEndDate = m.FreezeEndDate,
            FrozenDuration = m.FrozenDuration,
            ApplicationUserId = m.ApplicationUserId
        }).ToList();
    }

    public async Task<MemberResponseDto?> GetMemberAsync(int id)
    {
        var member = await _context.Members
            .Include(m => m.Plan)
            .Include(m => m.Trainer)
            .Include(m => m.ApplicationUser)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (member == null) return null;

        return new MemberResponseDto
        {
            Name = member.Name,
            Email = member.Email,
            PhoneNumber = member.PhoneNumber,
            TrainerName = member.Trainer != null ? member.Trainer.Name : "No Trainer Assigned",
            PlanName = member.Plan.Name + (member.Trainer != null ? (" " + member.Trainer.Name) : " (No Trainer Assigned)"),
            StartDate = member.StartDate,
            EndDate = member.EndDate,
            ApplicationUserName = member.ApplicationUser != null ? member.ApplicationUser.UserName : "No Application User Assigned",
            SessionCount = member.SessionCount,
            MaxSessions = member.Plan.NumberOfSessions == -1 ? "Unlimited" : member.Plan.NumberOfSessions.ToString(),
            IsActive = member.IsActive,
            IsFrozen = member.IsFrozen,
            FreezeStartDate = member.FreezeStartDate,
            FreezeEndDate = member.FreezeEndDate,
            FrozenDuration = member.FrozenDuration,
            ApplicationUserId = member.ApplicationUserId
        };
    }

    public async Task<(MemberResponseDto member, decimal payment)?> AddMemberAsync(MemberDto memberDTO)
    {
        if (string.IsNullOrEmpty(memberDTO.Email) || string.IsNullOrEmpty(memberDTO.PhoneNumber) || string.IsNullOrEmpty(memberDTO.Name))
            return null;

        if (await _context.Members.AnyAsync(m => m.Email == memberDTO.Email))
            return null;

        if (await _context.Members.AnyAsync(m => m.PhoneNumber == memberDTO.PhoneNumber))
            return null;

        if (string.IsNullOrEmpty(memberDTO.PlanId.ToString()))
            return null;

        var plan = await _context.Plans.FindAsync(memberDTO.PlanId);
        if (plan == null)
            return null;

        var startDate = DateTime.Now;
        var endDate = startDate.AddMonths(plan.Duration);

        var member = new Member
        {
            Name = memberDTO.Name,
            Email = memberDTO.Email,
            PhoneNumber = memberDTO.PhoneNumber,
            PlanId = memberDTO.PlanId,
            TrainerId = memberDTO.TrainerId,
            Plan = plan,
            StartDate = startDate,
            EndDate = endDate,
            SessionCount = 0
        };

        if (member.TrainerId != null)
            member.Trainer = await _context.Trainers.FindAsync(member.TrainerId);
        else
            member.Trainer = null;

        _context.Members.Add(member);
        await _context.SaveChangesAsync();

        var memberResponseDto = new MemberResponseDto
        {
            Email = member.Email,
            PhoneNumber = member.PhoneNumber,
            Name = member.Name,
            TrainerName = member.Trainer != null ? member.Trainer.Name : "No Trainer Assigned",
            PlanName = member.Plan.Name + (member.Trainer != null ? (" " + member.Trainer.Name) : " (No Trainer Assigned)"),
            StartDate = member.StartDate,
            EndDate = member.EndDate,
            ApplicationUserName = member.ApplicationUser != null ? member.ApplicationUser.UserName : "No Application User Assigned",
            SessionCount = member.SessionCount,
            MaxSessions = member.Plan.NumberOfSessions == -1 ? "Unlimited" : member.Plan.NumberOfSessions.ToString(),
            IsActive = member.IsActive,
            IsFrozen = member.IsFrozen,
            FreezeStartDate = member.FreezeStartDate,
            FreezeEndDate = member.FreezeEndDate,
            FrozenDuration = member.FrozenDuration
        };
        decimal Payment = plan.Price;
        if (member.Trainer != null)
        {
            Payment += plan.Price * 30 / 100;
        }
        return (memberResponseDto, Payment);
    }

    public async Task<bool> UpdateMemberAsync(int id, MemberDto updatedMember)
    {
        var member = await _context.Members.FindAsync(id);
        if (member == null)
            return false;

        if (!string.IsNullOrEmpty(updatedMember.Email))
        {
            member.Email = updatedMember.Email;
            var appUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == member.Email || u.Id == member.ApplicationUserId);
            if (appUser != null)
            {
                appUser.Email = updatedMember.Email;
                appUser.NormalizedEmail = updatedMember.Email.ToUpperInvariant();
                appUser.UserName = updatedMember.Email;
                appUser.NormalizedUserName = updatedMember.Email.ToUpperInvariant();
                await _notificationService.SendNotificationAsync(appUser.Id, "Your account has been updated successfully.");

            }
        }

        if (!string.IsNullOrEmpty(updatedMember.PhoneNumber))
        {
            member.PhoneNumber = updatedMember.PhoneNumber;
        }
        
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<string?> FreezeMemberAsync(int id, int FrozenDuration)
    {
        var member = await _context.Members
            .Include(m => m.Plan)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (member == null)
            return "NotFound";
        member.FrozenDuration = FrozenDuration;
        if (member.IsFrozen)
            return "AlreadyFrozen";
        if (member.FrozenDuration == null)
            return "NoFrozenDuration";
        if (member.Plan.IsSessional == true || member.FrozenDuration > member.Plan.Duration * 30 * 1 / 3)
            return "InvalidFreeze";
        if (member.IsActive == false)
            return "Inactive";

        member.FreezeStartDate = DateTime.Now;
        if (member.FrozenDuration.HasValue)
        {
            member.FreezeEndDate = member.FreezeStartDate?.AddDays(member.FrozenDuration.Value);
        }
        member.EndDate = member.EndDate.AddDays(member.FrozenDuration ?? 0);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == member.Email || u.Id == member.ApplicationUserId);
        if(user != null)
        {
            await _notificationService.SendNotificationAsync(user.Id, "Your membership has been frozen successfully.");
        }
        await _context.SaveChangesAsync();
        return null;
    }

    public async Task<string?> UnfreezeMemberAsync(int id)
    {
        var member = await _context.Members
            .Include(m => m.Plan)
            .Include(m => m.Trainer)
            .Include(m => m.ApplicationUser)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (member == null)
            return "NotFound";
        if (!member.IsFrozen)
            return "NotFrozen";
        if (member.IsActive == false)
            return "Inactive";

        TimeSpan remainingTime = member.FreezeEndDate.HasValue
            ? member.FreezeEndDate.Value - DateTime.Now
            : TimeSpan.Zero;
        member.EndDate = member.EndDate.Subtract(remainingTime);
        member.FreezeStartDate = null;
        member.FreezeEndDate = null;
        member.FrozenDuration = null;
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == member.Email || u.Id == member.ApplicationUserId);
        if(user != null)
        {
            await _notificationService.SendNotificationAsync(user.Id, "Your membership has been unfrozen successfully.");
        }
        await _context.SaveChangesAsync();
        return null;
    }

    public async Task<(string? error, decimal? payment)> RenewMemberAsync(int id, RenewMemberDto renewDto)
    {
        var member = await _context.Members.FindAsync(id);
        if (member == null)
            return ("NotFound", null);
        if (member.IsActive == true)
            return ("NoRenewNeeded", null);
        var newPlan = await _context.Plans.FindAsync(renewDto.PlanId);
        if (newPlan == null)
            return ("PlanNotFound", null);

        member.PlanId = newPlan.Id;
        member.Plan = newPlan;
        member.StartDate = DateTime.Now;
        member.EndDate = member.StartDate.AddMonths(newPlan.Duration);
        member.SessionCount = 0;

        if (renewDto.TrainerId.HasValue)
        {
            member.TrainerId = renewDto.TrainerId;
            member.Trainer = await _context.Trainers.FindAsync(renewDto.TrainerId);
        }
        else
        {
            member.TrainerId = null;
            member.Trainer = null;
        }

        await _context.SaveChangesAsync();
        decimal Payment = newPlan.Price;
        if (member.Trainer != null)
        {
            Payment += newPlan.Price * 30 / 100;
        }
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == member.Email || u.Id == member.ApplicationUserId);
        if(user != null)
        {
            await _notificationService.SendNotificationAsync(user.Id, "Your membership has been renewed successfully.");
        }
        return (null, Payment);
    }

    public async Task<string?> UpdateSessionCountAsync(int id)
    {
        var member = await _context.Members
            .Include(m => m.Plan)
            .Include(m => m.Trainer)
            .Include(m => m.ApplicationUser)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (member == null)
            return "NotFound";
        if (member.IsFrozen)
            return "Frozen";
        if (member.IsActive == false)
            return "Inactive";
        member.SessionCount++;
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == member.Email || u.Id == member.ApplicationUserId); 
        if (user != null &&  member.SessionCount == member.Plan.NumberOfSessions)
        {
            await _notificationService.SendNotificationAsync(user.Id, "Your Have consumed all your session, Please renew Your membership.");
        }
        await _context.SaveChangesAsync();
        return null;
    }

    public async Task<bool> DeleteMemberAsync(int id)
    {
        var member = await _context.Members.FindAsync(id);
        if (member == null)
            return false;

        _context.Members.Remove(member);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<Plan>> GetAllPlansAsync()
    {
        return await _context.Plans
            .Select(p => new Plan
            {
                Id = p.Id,
                Name = p.Name,
                Duration = p.Duration,
                Price = p.Price,
                NumberOfSessions = p.NumberOfSessions,
                IsSessional = p.IsSessional
            })
            .ToListAsync();
    }

    public async Task<List<Trainer>> GetAllTrainersAsync()
    {
        return await _context.Trainers
            .Select(t => new Trainer
            {
                Id = t.Id,
                Name = t.Name,
                Specialization = t.Specialization,
                PhoneNumber = t.PhoneNumber
            })
            .ToListAsync();
    }
}