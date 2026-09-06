Part of [the navigation plan](README.md).

# Scope

**Reaching a file from the trail without landing on its repository first.** The breadcrumb's menu as a two-level surface: repositories in the first panel, one repository's managed files as a tree in a submenu. Out of scope: the route and the trail's shape ([breadcrumbs.md](breadcrumbs.md)), and what the file altitude shows once reached ([file.md](file.md)).

# What & why

The trail's switcher moves **sideways** within an altitude — repository to repository, file to file. Crossing an altitude still costs the altitude: to open a file in another repository a user navigates to that repository, waits for its surface, and picks the file there.

The product owner has asked for the menu to reach **down** as well: hovering a repository in the switcher opens its managed files as a tree in a submenu, so a file in any repository is two gestures from anywhere. The same submenu carries the state language, which makes it a small answer to the product's central question as well as a navigation control — the menu shows what is sealed without the user going anywhere.

This also settles a question [the navigation plan](README.md) had left open — whether the file-level switcher should reach across all repositories or only the current one. It reaches across all of them, by reaching through the repository panel rather than by flattening the two lists into one.

This is a new navigation capability rather than a restyle of the switcher, which is why it does not ride the redesign's cosmetic work. It adds a surface that must fetch or hold every repository's file list, decide what it shows while that is unavailable, and behave when a repository holds more files than a menu can carry — none of which the flat switcher had to answer.

**Approved by the product owner.**

# Approach

TBD

# Steps

- [ ] Research solution directions
