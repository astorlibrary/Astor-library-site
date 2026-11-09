-- Register the November presentation decks for account saves and slide progress:
-- the 24 new free guides, and the two Wide Sargasso Sea guides that now open
-- their own slides. Keep existing resources, permissions and account data unchanged.

begin;

insert into public.resource_catalogue (resource_id, slide_count) values
  ('age-of-innocence', 12),
  ('american-ghost-stories-women', 9),
  ('american-whaling-1820-1860', 12),
  ('augustan-age-1688-1745', 10),
  ('bartleby-the-scrivener', 14),
  ('domestic-tragedy-1592-1608', 9),
  ('epic-tradition-homer-milton', 11),
  ('fingerprints-and-the-law', 8),
  ('first-folio-1623', 10),
  ('first-world-war-poets', 9),
  ('gogol-st-petersburg', 9),
  ('keats-1820-volume', 13),
  ('klondike-gold-rush-1896-1899', 13),
  ('locrine-and-the-puritan', 16),
  ('london-playhouses-1576-1642', 9),
  ('old-new-york-1840-1880', 13),
  ('revenge-tragedy-1587-1633', 9),
  ('romantic-poets-1789-1834', 11),
  ('sensation-novel-1860-1880', 11),
  ('seringapatam-1799-diamond', 9),
  ('troy-homeric-world', 9),
  ('vampire-before-dracula', 10),
  ('weird-fiction-blackwood', 10),
  ('wide-sargasso-sea-part-2', 13),
  ('wide-sargasso-sea-post-colonialism', 8),
  ('wilfred-owen-war-poems', 14)
on conflict (resource_id) do update set
  slide_count = excluded.slide_count;

commit;
