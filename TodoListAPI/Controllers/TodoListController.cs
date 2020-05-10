using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using TodoListAPI.Models;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Web.Resource;

namespace TodoListAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TodoListController : ControllerBase
    {
        // The Web API will only accept tokens 1) for users, and 
        // 2) having the access_as_user scope for this API
        static readonly string[] scopeRequiredByApi = new string[] { "access_as_user" };

        private readonly TodoContext _context;
        private ILogger<TodoListController> _logger;

        public TodoListController(TodoContext context, ILogger<TodoListController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/TodoItems
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TodoItem>>> GetTodoItems()
        {
            HttpContext.VerifyUserHasAnyAcceptedScope(scopeRequiredByApi);
            string owner = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            LogTokenClaims();
            return await _context.TodoItems.Where(item => item.Owner == owner).ToListAsync();
        }

        // GET: api/TodoItems/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TodoItem>> GetTodoItem(int id)
        {
            HttpContext.VerifyUserHasAnyAcceptedScope(scopeRequiredByApi);

            var todoItem = await _context.TodoItems.FindAsync(id);

            if (todoItem == null)
            {
                return NotFound();
            }

            return todoItem;
        }

        // PUT: api/TodoItems/5
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for
        // more details see https://aka.ms/RazorPagesCRUD.
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTodoItem(int id, TodoItem todoItem)
        {
            HttpContext.VerifyUserHasAnyAcceptedScope(scopeRequiredByApi);

            if (id != todoItem.Id)
            {
                return BadRequest();
            }

            _context.Entry(todoItem).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TodoItemExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/TodoItems
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for
        // more details see https://aka.ms/RazorPagesCRUD.
        [HttpPost]
        public async Task<ActionResult<TodoItem>> PostTodoItem(TodoItem todoItem)
        {
            HttpContext.VerifyUserHasAnyAcceptedScope(scopeRequiredByApi);
            string owner = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            todoItem.Owner = owner;

            var random = new Random();
            todoItem.Id = random.Next();

            todoItem.Status = false;


            _context.TodoItems.Add(todoItem);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetTodoItem", new { id = todoItem.Id }, todoItem);
        }

        // DELETE: api/TodoItems/5
        [HttpDelete("{id}")]
        public async Task<ActionResult<TodoItem>> DeleteTodoItem(int id)
        {
            HttpContext.VerifyUserHasAnyAcceptedScope(scopeRequiredByApi);

            var todoItem = await _context.TodoItems.FindAsync(id);
            if (todoItem == null)
            {
                return NotFound();
            }

            _context.TodoItems.Remove(todoItem);
            await _context.SaveChangesAsync();

            return todoItem;
        }

        private bool TodoItemExists(int id)
        {
            return _context.TodoItems.Any(e => e.Id == id);
        }

        private void LogTokenClaims()
        {
            const string scopeClaimType = "http://schemas.microsoft.com/identity/claims/scope";
            const string nameClaimType = "name"; // NB: no idea why this is not part of the ClaimTypes nor JwtRegisteredClaimNames enumerations

            // See how to stop token claims to be mapped into proprietary Microsoft ones: https://stackoverflow.com/questions/47696872/incorrect-claim-type
            // See explanation of which namespace to use for JwtRegisteredClaimNames: https://stackoverflow.com/questions/38526950/namespaces-for-net-jwt-token-validation-system-vs-microsoft#comment65187203_38901344
            var claimsLog = $"Received token with following claims: Name='{User.FindFirst(nameClaimType)?.Value}', NameIdentifier='{User.FindFirst(ClaimTypes.NameIdentifier)?.Value}', " +
                            $"Not Before='{DateTimeOffset.FromUnixTimeSeconds(long.Parse(User.FindFirst(JwtRegisteredClaimNames.Nbf)?.Value)).DateTime }', " +
                            $"Expiration='{DateTimeOffset.FromUnixTimeSeconds(long.Parse(User.FindFirst(JwtRegisteredClaimNames.Exp)?.Value)).DateTime }', " +
                            $"Scopes = '{User.FindFirst(scopeClaimType)?.Value}', Role = '{User.FindFirst(ClaimTypes.Role)?.Value}'";

            _logger.LogInformation(claimsLog);
        }
    }
}
