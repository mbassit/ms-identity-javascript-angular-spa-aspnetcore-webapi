using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TodoListAPI.Models;

namespace TodoListAPI
{
    // NB: see how to seed database at startup of an ASP.NET Core app: https://docs.microsoft.com/en-us/aspnet/core/data/ef-mvc/intro?view=aspnetcore-3.1#initialize-db-with-test-data
    public class Program
    {
        public static void Main(string[] args)
        {
            var host = CreateHostBuilder(args).Build();

            // See module [Creating and Using Scopes] of Pluralsight course: https://app.pluralsight.com/library/courses/aspdotnet-core-dependency-injection/table-of-contents
            using (var scope = host.Services.CreateScope())
            {
                var serviceProvider = scope.ServiceProvider;
                var logger = serviceProvider.GetRequiredService<ILogger<Program>>();

                try
                {
                    var context = serviceProvider.GetRequiredService<TodoContext>();
                    context.Database.EnsureCreated();

                    if (context.TodoItems.Any())
                    {
                        logger.LogInformation("Found already seeded database");
                    }
                    else
                    {
                        logger.LogInformation("Seeding database...");

                        context.TodoItems.AddRange(new List<TodoItem>()
                        {
                            new TodoItem {Id = 1, Owner = "Alice", Description = "Something to do 1", Status = false},
                            new TodoItem {Id = 2, Owner = "Bob", Description = "Something to do 2", Status = true},
                            new TodoItem {Id = 3, Owner = "AAAAAAAAAAAAAAAAAAAAAFEUL0zvuPpEINWG6RS0SAU", Description = "Something to do 3", Status = false},
                            new TodoItem {Id = 4, Owner = "AAAAAAAAAAAAAAAAAAAAAFEUL0zvuPpEINWG6RS0SAU", Description = "Something to do 4", Status = true}
                        });

                        context.SaveChanges();
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "An error occurred while seeding the database.");
                }
            }

            host.Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }
}
