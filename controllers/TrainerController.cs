using Microsoft.EntityFrameworkCore;
using MyGym_Backend.Data;
using MyGym_Backend.Modals;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace MyGym_Backend.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class TrainerController : ControllerBase
    {
        private readonly MyGymContext _context;

        public TrainerController(MyGymContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<List<Trainer>>> GetTrainers()
        {
            var trainers = await _context.Trainers.ToListAsync();
            return Ok(trainers);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Trainer>> GetTrainer(int id)
        {
            var trainer = await _context.Trainers.FindAsync(id);
            if (trainer == null)
            {
                return NotFound();
            }
            return Ok(trainer);
        }
        [HttpPost]
        public async Task<ActionResult<Trainer>> AddTrainer([FromBody] Trainer trainer)
        {
            _context.Trainers.Add(trainer);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetTrainer), new { id = trainer.Id }, trainer);
        }
    }
}
