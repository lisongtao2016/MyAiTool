namespace ScheduleApi.Models;

public class Task
{
    public int Id { get; set; }
    public int? ProjectId { get; set; }
    public string Group { get; set; } = string.Empty;
    public string SubGroup { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public int StartDay { get; set; }
    public int Duration { get; set; }
    public int Plan { get; set; }
    public int Actual { get; set; }
    public string Owner { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class TaskUpdateDto
{
    public string? Group { get; set; }
    public string? SubGroup { get; set; }
    public string? Name { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public int? StartDay { get; set; }
    public int? Duration { get; set; }
    public int? Plan { get; set; }
    public int? Actual { get; set; }
    public string? Owner { get; set; }
}