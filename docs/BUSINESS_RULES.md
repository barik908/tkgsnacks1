# TKG Snacks — Business Rules

## Cart & Order Decision

**Decision: ONE ORDER = ONE RESTAURANT**

Each order is tied to exactly one restaurant. If a customer adds items from a different restaurant, the cart is cleared and replaced with the new restaurant's items.

**Rationale:**
- Simplicity for delivery logistics
- Single delivery fee calculation
- One delivery boy per order
- Matches real-world Bangladeshi food delivery patterns

## Delivery Fee

| Restaurant Type | Fee |
|---|---|
| Partner Restaurant | ৳50 |
| Non-partner Restaurant | ৳60 |

Admin can override globally via Platform Settings.
Restaurant owners can set a per-restaurant override.

## Order Lifecycle

```
PLACED → ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → ON_THE_WAY → DELIVERED
```

Terminal states: `DELIVERED`, `CANCELLED`, `REJECTED`

Cancellation is only allowed from `PLACED` or `ACCEPTED`.

## Restaurant Visibility

- Restaurants start as `PENDING`.
- Admin must `APPROVE` before customers can see them.
- Admin can `HIDE` (isVisible=false) an approved restaurant.
- Hidden restaurants are invisible to customers but not to admin/owner.
- Suspended restaurants cannot receive orders.

## User Roles

| Role | Can |
|---|---|
| CUSTOMER | Browse, order, review |
| RESTAURANT_OWNER | Manage own restaurant only |
| DELIVERY_BOY | View/update assigned orders only |
| ADMIN | Full platform control |

## Payment

- Phase 1: Cash on Delivery only
- Online payment architecture is scaffolded but not connected to gateway
- No fake payment success is generated

## Verification Code

- 6-digit code generated per order
- Customer shares code with delivery boy on delivery
- Records proof of delivery
