using Microsoft.EntityFrameworkCore;
using MyGym_Backend.Data;
using MyGym_Backend.Modals;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MyGym_Backend.Services;
namespace MyGym_Backend.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class PlanController : ControllerBase
    {
        private readonly MyGymContext _Context;
        private readonly INotificationService _notificationService;
        
        public PlanController(MyGymContext context, INotificationService notificationService)
        {
            _Context = context;
            _notificationService = notificationService;
        }
        
        [HttpGet]
        public async Task<ActionResult<List<Plan>>> GetPlans()
        {
            var plans = await _Context.Plans.ToListAsync();
            return Ok(plans);
        }
        [HttpGet("{id}")]
        public async Task<ActionResult<Plan>> GetPlan(int id)
        {
            var plan = await _Context.Plans.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }
            return Ok(plan);
        }
        [HttpPost]
        public async Task<ActionResult<Plan>> CreatePlan([FromBody] Plan plan)
        {
            if (plan.IsSessional == false)
            {
                plan.NumberOfSessions = -1; 
            }
            else if (plan.IsSessional == true)
            {
                plan.Duration = 1; 
            }
            _Context.Plans.Add(plan);
            await _Context.SaveChangesAsync();
            foreach(var user in _Context.Users.ToList())
            {
                if(user.UserName == "admin")
                {
                    continue; 
                }
                await _notificationService.SendNotificationAsync(user.Id, $"New Plan Added : {plan.Name} for {plan.Duration} Month(s) at {plan.Price} Rs. per month.");
            }
            return CreatedAtAction(nameof(GetPlan), new { id = plan.Id }, plan);
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePlanPrice(int id, [FromBody] decimal newPrice)
        {
            var plan = await _Context.Plans.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }

            plan.Price = newPrice;

            try
            {
                await _Context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_Context.Plans.Any(p => p.Id == id))
                {
                    return NotFound();
                }
                throw;
            }
            foreach(var user in _Context.Users.ToList())
            {
                await _notificationService.SendNotificationAsync(user.Id, $"New Offer on : {plan.Name} Plan, {plan.Duration} Month(s) at {plan.Price} Rs. per month.");
            }
            return NoContent();
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePlan(int id)
        {
            var plan = await _Context.Plans.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }

            _Context.Plans.Remove(plan);
            await _Context.SaveChangesAsync();
            return NoContent();
        }
    }
}