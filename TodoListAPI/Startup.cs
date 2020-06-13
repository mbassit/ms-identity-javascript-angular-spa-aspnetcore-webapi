
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using TodoListAPI.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace TodoListAPI
{
    // NB: how to exclude the node_modules folder in Visual Studio WebSite projects: https://weblog.west-wind.com/posts/2016/Oct/30/Excluding-the-nodemodules-Folder-in-Visual-Studio-WebSite-Projects
    // New "Microsoft.Identity.Web" library documentation: https://github.com/AzureAD/microsoft-identity-web/wiki
    // Handling errors in MSAL.NET: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-handling-exceptions?tabs=dotnet
    // TODO:
    // - try not using the new preview package "Microsoft.Identity.Web" but only the "Microsoft.AspNetCore.Authentication.AzureAD.UI" (e.g. use AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(...)) as in B. Noyes Pluralsight course
    // - try claims checking as in the [Authorization in APIs] module of Pluralsight course: https://app.pluralsight.com/library/courses/authentication-authorization-aspnet-core/transcript
    // - not sure how to try Azure AD B2C, but when it, in Startup.cs do: "services.AddAuthentication(AzureADB2CDefaults.AuthenticationScheme).AddAzureADB2C(....)" which is in nuget package "Microsoft.AspNetCore.Authentication.AzureADB2C.UI", as shown: https://youtu.be/M23P7tj_bXA?t=1865
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // Setting configuration for protected web api
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddProtectedWebApi(Configuration);

            // Creating policies that wraps the authorization requirements
            // See here example of how to add multiple policies: https://github.com/blowdart/AspNetAuthorizationWorkshop#step-4-simple-policies
                //services.AddAuthorization(options =>
                //{
                //    options.AddPolicy("AdministratorOnly", policy => policy.RequireRole("Administrator"));
                //    options.AddPolicy("EmployeeId", policy => policy.RequireClaim("EmployeeId"));
                //});
            services.AddAuthorization();

            services.AddDbContext<TodoContext>(opt => opt.UseInMemoryDatabase("TodoList"));

            services.AddControllers();
            
            // Allowing CORS for all domains and methods for the purpose of sample
            services.AddCors(o => o.AddPolicy("default", builder =>
            {
                builder.AllowAnyOrigin()
                       .AllowAnyMethod()
                       .AllowAnyHeader();
            }));
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                // Since IdentityModel version 5.2.1 (or since Microsoft.AspNetCore.Authentication.JwtBearer version 2.2.0),
                // Personal Identifiable Information is not written to the logs by default, to be compliant with GDPR.
                // For debugging/development purposes, one can enable additional detail in exceptions by setting IdentityModelEventSource.ShowPII to true.
                // Microsoft.IdentityModel.Logging.IdentityModelEventSource.ShowPII = true;
                app.UseDeveloperExceptionPage();
            }
            else
            {
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseCors("default");
            app.UseHttpsRedirection();
            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}