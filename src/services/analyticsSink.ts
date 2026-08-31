import type { AnalyticsEvent } from "../domain/analytics";
import type { ExperimentAssignment } from "../domain/experiment";

export class AnalyticsSink {
  readonly events: AnalyticsEvent[] = [];
  assignment: ExperimentAssignment | null = null;

  setAssignment(assignment: ExperimentAssignment | null): void {
    this.assignment = assignment;
  }

  emit(event: AnalyticsEvent): void {
    this.events.push({
      ...event,
      ...(this.assignment
        ? {
            exp_id: this.assignment.exp_id,
            variant: this.assignment.variant,
            user_id: this.assignment.user_id,
          }
        : {}),
    });
  }

  names(): string[] {
    return this.events.map((event) => event.name);
  }

  reset(): void {
    this.events.length = 0;
    this.assignment = null;
  }
}
