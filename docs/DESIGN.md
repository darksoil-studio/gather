
```mermaid
stateDiagram-v2
    [*] --> OpenEventProposal: create_event_proposal
    [*] --> UpcomingEvent: create_event
    OpenEventProposal --> UpcomingEvent: fulfill_needs
    UpcomingEvent --> CancelledEvent: cancel_event
    CancelledEvent --> UpcomingEvent: undo_cancellation
    UpcomingEvent --> PastEvent: date_passes
    OpenEventProposal --> ExpiredEventProposal: expiry_date_passes
    OpenEventProposal --> CancelledEventProposal: cancel_proposal
    CancelledEventProposal --> OpenEventProposal: undo_cancellation
```