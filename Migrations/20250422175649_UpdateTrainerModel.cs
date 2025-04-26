using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyGym_Backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTrainerModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "Trainers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Specialization",
                table: "Trainers",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "Trainers");

            migrationBuilder.DropColumn(
                name: "Specialization",
                table: "Trainers");
        }
    }
}
