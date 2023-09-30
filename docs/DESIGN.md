
```mermaid
stateDiagram-v2
    [*] --> OpenEventProposal: create_event_proposal
    [*] --> UpcomingEvent: create_event
    OpenEventProposal --> UpcomingEvent: fulfill_participants
    UpcomingEvent --> CancelledEvent: cancel_event
    UpcomingEvent --> PastEvent: date_passes
    OpenEventProposal --> ExpiredEventProposal: expiry_date_passes
    OpenEventProposal --> CancelledEventProposal: cancel_event
```