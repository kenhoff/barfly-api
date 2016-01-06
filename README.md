# barfly-api
The part that handles the data


Thoughts on API routes

## API Routes
- `GET /user` - gets information about the currently signed in user (checks the jwt)
- `POST /user` - updates information on the currently signed in user (things like name updates, etc)
	- `GET /user/bars` - gets all bars for the user in the token
	- `POST /user/bars` - creates a new bar with name, zip code, and adds the bar to the user in the token
- `GET /bars` - gets all bars (admin)
- `POST /bars` - creates a new bar with a name and zip code (admin only)
	- `GET /bars/:barID` - gets info about a bar, provided that the user has the bar in their app_metadata
	- `POST /bars/:barID` - updates info about a bar, provided that the user has the bar in their app_metadata
		<!-- memberships -->
		- `GET /bars/:barID/users` - gets all users for that bar, with roles (provided the user is in the bar, or is an admin)
		- `POST /bars/:barID/users` - adds a new user to that bar, with role (provided the user is in the bar, or is an admin)
			- `GET /bars/:barID/users/:userID` - gets a single user's membership from that bar, with their role information (provided the requesting user is in the bar, or is an admin)
			- `POST /bars/:barID/users/:userID` - updates a single user's membership from that bar, with their role information (provided the requesting user is in the bar, or is an admin)
			- `DELETE /bars/:barID/users/:userID` - deletes a single user's membership from that bar (provided the requesting user is in the bar, or is an admin)
		<!-- orders -->
		- `GET /bars/:barID/orders` - gets all orders for a bar, provided the user in the token has the bar in their app_metadata (or user is admin)
		- `POST /bars/:barID/orders` - creates a new order for a bar, provided the user in the token has the bar in their app_metadata (or user is admin)
			- `GET /bars/:barID/orders/:orderID` - get a specific order for a bar, provided the user in the token has the bar in their app_metadata (or user is admin)
			- `PATCH /bars/:barID/orders/:orderID` - update a specific order for a bar, provided the user in the token has the bar in their app_metadata (or user is admin)
			- `POST /bars/:barID/orders/:orderID` - sends the specific order, provided the user in the token has the var in their app_metadata (or user is admin). fires off all the requisite texts and emails. also sets the current user as the "sender" for the order.
- `GET /products` - gets *all* products, not secured.
- `POST /products` - creates a new product, secured, fires off lots of notifications to Ken & Peter saying that we've got to take a look at the new product
- `GET /orders` - gets *all* orders, admin only.

## Tables

### Primary tables
- `users` - can be bar managers, sales reps, and (later) distributor/supplier managers
	- if the `user.type` is `rep`, then the rep also must have one `distributor`.
	- if the `user.type` is `bar_manager`, then the bar manager must also have a list of `bars`.
- `bars` - places where liquor is delivered to, managed by multiple bar managers - basically have different views for different bars - needs to have a `zipcode`
- `memberships` - list of roles assigned to users in bars. For now, everyone is an `owner` (which can order & edit bar info). Later on, we'll have `manager`s (which can only order) and.....other roles, as needed.
- `products` - liquor, beer, and wine. each product has multiple sizes - there aren't multiple products in different sizes (e.g. patron has only one product listing, with x sizes - there aren't x patron products, one for each size). Each product also has a supplier, or brand.
- `accounts` - each account has one `distributor`, one `bar`, and one `rep`.
- `distributors`
- `product_distributor_zipcodes` - reference table, no resources. each entry has one `product`, one `distributor`, and one `zipcode`. Compound index - on zipcode and product - there can only be one distributor per product in a given zip code.
- `orders` - orders from a bar. each `order` contains a `bar` (barID), `created_by` (userID), `sent_by` (userID), `created_at` (datetime), `sent_at` (datetime)


- `product_orders` - individual product orders. each one contains a product ID, product size, product count, and parent `order`.


<!-- - `distributor_orders` - orders to individual distributors. each `distributor_order` contains an `order` that it's associated with, an `account` that it's ordered through (which contains a `distributor` and a `rep`), as well as a list of `products` (with count and size). -->

### Secondary tables

- Sizes - sizes for liquor
- Zip codes - a single product is carried by a single distributor in a zip code. this is a list of all zip codes
- Suppliers - Suppliers carry multiple products. sort of like brands.
- `counters` - keeps track of serial indexes for each table.

## Order flows

when a user orders a product:
- look up the user's bar's zip code
- look up what distributor carries that product in that zip code
- find the account that the distributor has with the bar
- from the account, find the rep that has the account with the bar
- send the order to the rep

when a user creates an order:
- a "base order" for the bar is created
- several individual "distributor orders" are created

every time a user modifies an order (adds or removes a product):
- we look up the user's bar's zip code
- we look up in `zipcodes` to find which distributor carries that product
- we look up `distributor_orders` to see if we already have an order where the `order` is the current one and the `account` -> `distributor` is the one that we want
	- (if not, we create one)
- we modify the `distributor_order`

so the next issue is, what happens if we don't have the right information yet?
- What happens if a user tries to order a specific product, and it's not there?
	- We should allow users to create new products. It might be a little wonky to begin with, but once we get all the major products in there and have an admin interface to add, delete and modify specific products, then it'll be alright.
- What happens if a user tries to order a specific product, and we don't know who carries it in their zip code?
	- We should also allow users to create new distributors. Basically, once the user tries to order a product that we can't find a distributor in their zip code for, then we stop them, say "hey, we can't find a distributor in 80302 for that product!" then either have the user select from a list of distributors, or create a new one.
- What happens if a user tries to order a specific product, and we don't know which rep it's carried by?
	- We should alos allow users to create new reps. Once the user orders (and all of this stuff will happen if they're putting in a new product), we won't be able to find an "account" for the bar, so we'll need to ask the users to select from a number of reps from this distributor, or put in a new rep that works for the distributor of this product
(all of this stuff should happen at ordering time - no pre-filling or admin-style stuff necessary) - probably modals, popups, whatever we can do.
