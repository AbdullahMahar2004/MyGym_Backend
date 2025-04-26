using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MyGym_Backend.DTO;

namespace MyGym_Backend.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IMemberRepo _memberRepo;

        public AdminController(IMemberRepo memberRepo)
        {
            _memberRepo = memberRepo;
        }
        [HttpGet]
        public async Task<ActionResult<List<MemberResponseDto>>> GetMembers()
        {
            var members = await _memberRepo.GetMembersAsync();
            return Ok(members);
        }
        [HttpGet("{id}")]
        public async Task<ActionResult<MemberResponseDto>> GetMember(int id)
        {
            var member = await _memberRepo.GetMemberAsync(id);
            if (member == null)
                return NotFound();
            return Ok(member);
        }
        [HttpPost]
        public async Task<ActionResult> AddMember([FromBody] MemberDto memberDTO)
        {
            var result = await _memberRepo.AddMemberAsync(memberDTO);
            if (result == null)
                return BadRequest("Invalid member data or duplicate email/phone.");
            return CreatedAtAction(nameof(GetMember), new { id = result.Value.member.Id }, new { member = result.Value.member, payment = result.Value.payment });
        }    
        [HttpPut("{id}/update")]
        public async Task<IActionResult> UpdateMember(int id, [FromBody] MemberDto updatedMember)
        {
            var success = await _memberRepo.UpdateMemberAsync(id, updatedMember);
            if (!success)
                return NotFound();
            return NoContent();
        }

        [HttpPut("{id}/Freeze")]
        public async Task<IActionResult> FreezeMember(int id, [FromBody] int frozenDuration)
        {
            var result = await _memberRepo.FreezeMemberAsync(id, frozenDuration);
            if (result == "NotFound")
                return NotFound();
            if (result == "AlreadyFrozen")
                return BadRequest("Member is already frozen.");
            if (result == "NoFrozenDuration")
                return BadRequest("Frozen duration is not set.");
            if (result == "InvalidFreeze")
                return BadRequest("Cannot freeze for more than 1/3 of the plan duration or sessional plans");
            if (result == "Inactive")
                return BadRequest("Member is already inactive and cannot be frozen.");
            return NoContent();
        }

        [HttpPut("{id}/Unfreeze")]
        public async Task<IActionResult> ReactivateMember(int id)
        {
            var result = await _memberRepo.UnfreezeMemberAsync(id);
            if (result == "NotFound")
                return NotFound();
            if (result == "NotFrozen")
                return BadRequest("Member is not frozen.");
            if (result == "Inactive")
                return BadRequest("Member is already inactive and cannot be reactivated.");
            return NoContent();
        }

        [HttpPut("{id}/Renew")]
        public async Task<IActionResult> RenewMember(int id, [FromBody] RenewMemberDto renewDto)
        {
            var (error, payment) = await _memberRepo.RenewMemberAsync(id, renewDto);
            if (error == "NotFound")
                return NotFound();
            if (error == "NoRenewNeeded")
                return BadRequest("Member does not need to renew.");
            if (error == "PlanNotFound")
                return NotFound("New plan not found.");
            return Ok(new { Message = "Member renewed successfully", payment });
        }
        [HttpPut("{id}/update-session-count")]
        public async Task<IActionResult> UpdateSessionCount(int id)
        {
            var result = await _memberRepo.UpdateSessionCountAsync(id);
            if (result == "NotFound")
                return NotFound();
            if (result == "Frozen")
                return BadRequest("Member is frozen and cannot update session count. You can unfreeze the member first.");
            if (result == "Inactive")
                return BadRequest("Please renew your subscription.");
            return NoContent();
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMember(int id)
        {
            var success = await _memberRepo.DeleteMemberAsync(id);
            if (!success)
                return NotFound();
            return NoContent();
        }
    }
}