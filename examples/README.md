# Large ecommerce model

Import `ecommerce.cmmf.json`, or choose **Canvas guide → Load large ecommerce model** in the editor. Loading is reversible with Undo. The example contains **34 models, 201 fields**, all thirteen CMMF field types and all five model kinds.

The catalogue foundation is adapted from commercetools' documented product model: products group sellable variants; product types define attributes; categories organise products; variant offers carry contextual prices; inventory is associated with SKU/supply contexts. Read [Product catalog overview](https://docs.commercetools.com/api/product-catalog-overview) and [Modelling products](https://docs.commercetools.com/learning-model-your-product-catalog/product-modeling/modeling-products).

This is an original CMMF modelling example inspired by those concepts, not an official commercetools model, a verbatim API schema, or a ready-made commerce implementation. Additional brands, storefront composition, SEO, policies and campaigns are illustrative editorial extensions. Prices, taxes, promotions and stock express integration contracts; calculation and transaction handling remain in the appropriate commerce systems.

The example includes catalogue, product variants, attribute definitions and values, money and price tiers, inventory, warehouses, sales/supply channels, regional storefronts and assortments, customer groups, promotions, shipping and tax classification, plus landing pages, heroes, product grids, navigation, links, campaigns, sizing and policy content.

The layout is a spaced grid with row heights based on the tallest type. It deliberately includes self-references, multiple target models, linked and contained relationships, object composition, localisation and repeatability. All target identities resolve and all models pass the CMMF schema and editor consistency checks.

At the full-board overview, use the minimap and zoom controls or **Focus a content type** to inspect a specific type at a readable size. Double-clicking a type focuses it and opens its inspector. Export CMMF to obtain individual YAML models, or save the workspace to preserve layout.
