using MyGym_Backend.Data;
using MyGym_Backend.Modals;
using MyGym_Backend.DTO;
using Microsoft.EntityFrameworkCore;

public interface IMemberRepo
{
    Task<List<MemberResponseDto>> GetMembersAsync();
    Task<MemberResponseDto?> GetMemberAsync(int id);
    Task<(MemberResponseDto member, decimal payment)?> AddMemberAsync(MemberDto memberDTO);
    Task<bool> UpdateMemberAsync(int id, MemberDto updatedMember);
    Task<string?> FreezeMemberAsync(int id, int frozenDuration);
    Task<string?> UnfreezeMemberAsync(int id);
    Task<(string? error, decimal? payment)> RenewMemberAsync(int id, RenewMemberDto renewDto);
    Task<string?> UpdateSessionCountAsync(int id);
    Task<bool> DeleteMemberAsync(int id);
    Task<List<Plan>> GetAllPlansAsync();
    Task<List<Trainer>> GetAllTrainersAsync();
}