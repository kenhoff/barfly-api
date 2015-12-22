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
	- `GET /bars/:barID/orders` - gets all orders for a bar, provided the user in the token has the bar in their app_metadata (or user is admin)
	- `POST /bars/:barID/orders` - creates a new order for a bar, provided the user in the token has the bar in their app_metadata (or user is admin)
		- `GET /bars/:barID/orders/:orderID` - get a specific order for a bar, provided the user in the token has the bar in their app_metadata (or user is admin)
		- `POST /bars/:barID/orders/:orderID` - update a specific order for a bar, provided the user in the token has the bar in their app_metadata (or user is admin)
			- `POST /bars/:barID/orders/:orderID/send` - sends the specific order, provided the user in the token has the var in their app_metadata (or user is admin). fires off all the requisite texts and emails. also sets the current user as the "sender" for the order.
- `GET /orders` - gets *all* orders, admin only.

## Tables

### Primary tables
- `users` - can be bar managers, sales reps, and (later) distributor/supplier managers
	- if the `user.type` is `rep`, then the rep also must have one `distributor`.
	- if the `user.type` is `bar_manager`, then the bar manager must also have a list of `bars`.
- `bars` - places where liquor is delivered to, managed by multiple bar managers - basically have different views for different bars - needs to have a `zipcode`
- `products` - liquor, beer, and wine. each product has multiple sizes - there aren't multiple products in different sizes (e.g. patron has only one product listing, with x sizes - there aren't x patron products, one for each size). Each product also has a supplier, or brand.
- `accounts` - each account has one `distributor`, one `bar`, and one `rep`.
- `distributors` - each distributor has a list of accounts, specified in the `accounts` collection.
- `product_distributor_zipcodes` - each entry has one `product`, one `distributor`, and one `zipcode`. Compound index - on zipcode and product - there can only be one distributor per product in a given zip code.
- `orders` - orders from a bar. each `order` contains a `bar`, a `user` bar manager that ordered it, and some other metadata.
- `distributor_orders` - orders to individual distributors. each `distributor_order` contains an `order` that it's associated with, an `account` that it's ordered through (which contains a `distributor` and a `rep`), as well as a list of `products` (with count and size).

### Secondary tables

- Sizes - sizes for liquor
- Zip codes - a single product is carried by a single distributor in a zip code. this is a list of all zip codes
- Suppliers - Suppliers carry multiple products. sort of like brands.
- `counters` - keeps track of serial indexes for each table.


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


side thoughts - that means that we're gonna need to have separate states for if a user has more than 1 bar

on user activation and sign in, we need them to tell us a little bit about their bar - notably the bar's name and the bar's zip code. once they've done that, we create a new bar, add the user to that bar, and then we're off.