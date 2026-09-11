-- Register the September presentation decks for account saves and slide progress.
-- Keep existing resources, permissions and account data unchanged.

begin;

insert into public.resource_catalogue (resource_id, slide_count) values
  ('ancient-mariner-versions-and-gloss', 14),
  ('arden-of-faversham-1592', 15),
  ('blackwood-the-willows', 11),
  ('dracula-1897-origins', 13),
  ('duchess-of-malfi-1623', 14),
  ('gogol-overcoat-the-mantle', 15),
  ('hamlet-three-texts', 11),
  ('iliad-samuel-butler', 13),
  ('king-lear-two-texts', 13),
  ('macbeth-folio-and-middleton', 10),
  ('moby-dick-1851-publication', 13),
  ('moonstone-1868', 14),
  ('othello-two-texts', 9),
  ('paradise-lost-publication-and-form', 13),
  ('pope-lock-and-criticism', 17),
  ('puddnhead-wilson-1894', 13),
  ('sir-thomas-more-manuscript', 13),
  ('white-fang-1906', 10)
on conflict (resource_id) do update set
  slide_count = excluded.slide_count;

commit;
