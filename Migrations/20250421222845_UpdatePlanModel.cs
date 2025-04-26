using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyGym_Backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePlanModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Plans",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Name",
                table: "Plans");
        }
    }
}
