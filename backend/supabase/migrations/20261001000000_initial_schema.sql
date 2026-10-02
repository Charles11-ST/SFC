create extension if not exists pgcrypto;

-- Supabase Auth owns credentials. This table contains public identity only.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create table public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  bio text not null default '' check (char_length(bio) <= 2000),
  profile_photo_path text,
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'Zimbabwe' check (country = 'Zimbabwe'),
  province text not null,
  district text not null,
  created_at timestamptz not null default now(),
  unique (country, province, district)
);

insert into public.locations (province, district) values
('Bulawayo Metropolitan','Bulawayo'),('Harare Metropolitan','Harare'),('Harare Metropolitan','Chitungwiza'),
('Manicaland','Buhera'),('Manicaland','Chimanimani'),('Manicaland','Chipinge'),('Manicaland','Makoni'),('Manicaland','Mutare'),('Manicaland','Mutasa'),('Manicaland','Nyanga'),
('Mashonaland Central','Bindura'),('Mashonaland Central','Guruve'),('Mashonaland Central','Mazowe'),('Mashonaland Central','Mount Darwin'),('Mashonaland Central','Muzarabani'),('Mashonaland Central','Rushinga'),('Mashonaland Central','Shamva'),
('Mashonaland East','Chikomba'),('Mashonaland East','Goromonzi'),('Mashonaland East','Marondera'),('Mashonaland East','Mudzi'),('Mashonaland East','Murehwa'),('Mashonaland East','Mutoko'),('Mashonaland East','Seke'),('Mashonaland East','Uzumba-Maramba-Pfungwe'),('Mashonaland East','Wedza'),
('Mashonaland West','Chegutu'),('Mashonaland West','Hurungwe'),('Mashonaland West','Kariba'),('Mashonaland West','Makonde'),('Mashonaland West','Mhondoro-Ngezi'),('Mashonaland West','Sanyati'),('Mashonaland West','Zvimba'),
('Masvingo','Bikita'),('Masvingo','Chiredzi'),('Masvingo','Chivi'),('Masvingo','Gutu'),('Masvingo','Masvingo'),('Masvingo','Mwenezi'),('Masvingo','Zaka'),
('Matabeleland North','Binga'),('Matabeleland North','Bubi'),('Matabeleland North','Hwange'),('Matabeleland North','Lupane'),('Matabeleland North','Nkayi'),('Matabeleland North','Tsholotsho'),('Matabeleland North','Umguza'),
('Matabeleland South','Beitbridge'),('Matabeleland South','Bulilima'),('Matabeleland South','Gwanda'),('Matabeleland South','Insiza'),('Matabeleland South','Mangwe'),('Matabeleland South','Matobo'),('Matabeleland South','Umzingwane'),
('Midlands','Chirumhanzu'),('Midlands','Gokwe North'),('Midlands','Gokwe South'),('Midlands','Gweru'),('Midlands','Kwekwe'),('Midlands','Mberengwa'),('Midlands','Shurugwi'),('Midlands','Zvishavane')
on conflict do nothing;

create table public.farmer_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  location_id uuid not null references public.locations(id),
  town_area text not null check (char_length(town_area) between 1 and 120),
  farm_name text check (farm_name is null or char_length(farm_name) <= 120),
  farm_size_hectares numeric(10,2) check (farm_size_hectares is null or farm_size_hectares >= 0),
  experience_years smallint check (experience_years is null or experience_years between 0 and 100),
  updated_at timestamptz not null default now()
);

create table public.private_location_coordinates (
  user_id uuid primary key references public.users(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  updated_at timestamptz not null default now()
);

create table public.farming_interests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('Crop','Livestock'))
);
insert into public.farming_interests (slug, name, category) values
('maize','Maize','Crop'),('tobacco','Tobacco','Crop'),('wheat','Wheat','Crop'),('soybeans','Soybeans','Crop'),('cotton','Cotton','Crop'),('vegetables','Vegetables','Crop'),('fruits','Fruits','Crop'),('other-crops','Other crops','Crop'),
('cattle','Cattle','Livestock'),('poultry','Poultry','Livestock'),('goats','Goats','Livestock'),('sheep','Sheep','Livestock'),('pigs','Pigs','Livestock'),('other-livestock','Other livestock','Livestock')
on conflict (slug) do nothing;

create table public.user_farming_interests (
  user_id uuid not null references public.users(id) on delete cascade,
  interest_id uuid not null references public.farming_interests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, interest_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  community_id uuid,
  content text not null check (char_length(content) between 1 and 10000),
  image_path text,
  visibility text not null default 'public' check (visibility in ('public','connections','community')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index posts_recent_idx on public.posts (created_at desc) where deleted_at is null;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.likes (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create table public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);
create table public.connections (
  user_id uuid not null references public.users(id) on delete cascade,
  connected_user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, connected_user_id),
  check (user_id <> connected_user_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 10000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conversation_recent_idx on public.messages (conversation_id, created_at desc);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  created_by uuid not null references public.users(id),
  location_id uuid references public.locations(id),
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now()
);
alter table public.posts add constraint posts_community_fk foreign key (community_id) references public.communities(id) on delete set null;
create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','admin')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table public.experts (
  user_id uuid primary key references public.users(id) on delete cascade,
  professional_role text not null,
  organization text,
  location_id uuid references public.locations(id),
  bio text not null default '' check (char_length(bio) <= 3000),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now()
);
create table public.expert_interests (
  expert_id uuid not null references public.experts(user_id) on delete cascade,
  interest_id uuid not null references public.farming_interests(id) on delete cascade,
  primary key (expert_id, interest_id)
);
create table public.expert_follows (
  user_id uuid not null references public.users(id) on delete cascade,
  expert_id uuid not null references public.experts(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, expert_id),
  check (user_id <> expert_id)
);

create table public.agricultural_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location_id uuid references public.locations(id),
  location_label text not null,
  category text not null check (category in ('crop_disease','livestock_disease','pest','veterinary','agricultural_warning')),
  severity text not null check (severity in ('information','watch','warning','urgent')),
  source text not null,
  source_url text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  published_at timestamptz not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_location_date_idx on public.agricultural_alerts (location_id, published_at desc) where verification_status = 'verified';

create table public.agricultural_news (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  title text not null,
  description text not null default '',
  source text not null,
  source_url text not null,
  location_id uuid references public.locations(id),
  category text,
  published_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  unique (source, external_id)
);
create index agricultural_news_location_date_idx on public.agricultural_news (location_id, published_at desc);

create table public.weather_cache (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id),
  latitude double precision,
  longitude double precision,
  provider text not null,
  source_url text not null,
  response jsonb not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (location_id is not null or (latitude is not null and longitude is not null))
);
create index weather_cache_lookup_idx on public.weather_cache (location_id, observed_at desc);
create index weather_cache_expiry_idx on public.weather_cache (expires_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  kind text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.saved_posts (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create table public.trending_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  location_id uuid references public.locations(id),
  interest_id uuid references public.farming_interests(id),
  source_type text not null check (source_type in ('post','news','alert','market','weather_discussion')),
  source_id text not null,
  engagement_count integer not null default 0 check (engagement_count >= 0),
  measured_at timestamptz not null,
  unique (source_type, source_id, location_id)
);

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.farmer_profiles enable row level security;
alter table public.private_location_coordinates enable row level security;
alter table public.farming_interests enable row level security;
alter table public.user_farming_interests enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.shares enable row level security;
alter table public.connections enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.experts enable row level security;
alter table public.expert_interests enable row level security;
alter table public.expert_follows enable row level security;
alter table public.agricultural_alerts enable row level security;
alter table public.agricultural_news enable row level security;
alter table public.weather_cache enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_posts enable row level security;
alter table public.trending_topics enable row level security;

create policy "Users are discoverable by signed-in members" on public.users for select to authenticated using (true);
create policy "Users update their own public identity" on public.users for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Members can read profiles" on public.profiles for select to authenticated using (true);
create policy "Members manage own profile" on public.profiles for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Anyone can read location catalog" on public.locations for select to anon, authenticated using (true);
create policy "Anyone can read farming interests" on public.farming_interests for select to anon, authenticated using (true);
create policy "Members can read farmer profiles" on public.farmer_profiles for select to authenticated using (true);
create policy "Members manage own farmer profile" on public.farmer_profiles for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members read own precise coordinates" on public.private_location_coordinates for select to authenticated using (user_id = (select auth.uid()));
create policy "Members manage own precise coordinates" on public.private_location_coordinates for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members can read farming interests" on public.user_farming_interests for select to authenticated using (true);
create policy "Members manage own interests" on public.user_farming_interests for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Members read visible posts" on public.posts for select to authenticated using (
  deleted_at is null and (
    visibility = 'public' or author_id = (select auth.uid())
    or (visibility = 'connections' and exists (select 1 from public.connections c where c.status = 'accepted' and ((c.user_id = author_id and c.connected_user_id = (select auth.uid())) or (c.connected_user_id = author_id and c.user_id = (select auth.uid())))))
    or (visibility = 'community' and exists (select 1 from public.community_members cm where cm.community_id = posts.community_id and cm.user_id = (select auth.uid())))
  )
);
create policy "Members create own posts" on public.posts for insert to authenticated with check (author_id = (select auth.uid()));
create policy "Authors update own posts" on public.posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "Authors remove own posts" on public.posts for delete to authenticated using (author_id = (select auth.uid()));
create policy "Comments visible with posts" on public.comments for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id and p.deleted_at is null));
create policy "Members create own comments" on public.comments for insert to authenticated with check (author_id = (select auth.uid()));
create policy "Authors update own comments" on public.comments for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "Authors delete own comments" on public.comments for delete to authenticated using (author_id = (select auth.uid()));
create policy "Members read likes" on public.likes for select to authenticated using (true);
create policy "Members manage own likes" on public.likes for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members read shares" on public.shares for select to authenticated using (true);
create policy "Members manage own shares" on public.shares for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members read their connections" on public.connections for select to authenticated using (user_id = (select auth.uid()) or connected_user_id = (select auth.uid()));
create policy "Members create connection requests" on public.connections for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Invitees respond to connection requests" on public.connections for update to authenticated using (connected_user_id = (select auth.uid()) and status = 'pending') with check (connected_user_id = (select auth.uid()) and status in ('accepted','rejected'));

create policy "Members read their conversations" on public.conversations for select to authenticated using (created_by = (select auth.uid()) or exists (select 1 from public.conversation_members cm where cm.conversation_id = id and cm.user_id = (select auth.uid())));
create policy "Members create conversations" on public.conversations for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Members read their conversation membership" on public.conversation_members for select to authenticated using (user_id = (select auth.uid()));
create policy "Creator adds self to new conversation" on public.conversation_members for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = (select auth.uid())));
create policy "Members read conversation messages" on public.messages for select to authenticated using (exists (select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = (select auth.uid())));
create policy "Members send own messages" on public.messages for insert to authenticated with check (sender_id = (select auth.uid()) and exists (select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = (select auth.uid())));

create policy "Members read public communities" on public.communities for select to authenticated using (visibility = 'public' or exists (select 1 from public.community_members cm where cm.community_id = id and cm.user_id = (select auth.uid())));
create policy "Members create communities" on public.communities for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Members see their own community membership" on public.community_members for select to authenticated using (user_id = (select auth.uid()));
create policy "Members join as themselves" on public.community_members for insert to authenticated with check (user_id = (select auth.uid()) and role = 'member');
create policy "Verified experts are visible" on public.experts for select to authenticated using (verification_status = 'verified' or user_id = (select auth.uid()));
create policy "Users request expert verification" on public.experts for insert to authenticated with check (user_id = (select auth.uid()) and verification_status = 'pending');
create policy "Pending expert can edit own request" on public.experts for update to authenticated using (user_id = (select auth.uid()) and verification_status = 'pending') with check (user_id = (select auth.uid()) and verification_status = 'pending');
create policy "Verified expert topics visible" on public.expert_interests for select to authenticated using (exists (select 1 from public.experts e where e.user_id = expert_id and e.verification_status = 'verified'));
create policy "Members manage expert follows" on public.expert_follows for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Only verified alerts are visible" on public.agricultural_alerts for select to authenticated using (verification_status = 'verified' and (expires_at is null or expires_at > now()));
create policy "Members read sourced agricultural news" on public.agricultural_news for select to authenticated using (true);
create policy "Members read current weather cache" on public.weather_cache for select to authenticated using (expires_at > now());
create policy "Users read own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "Users update own notifications" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users manage their saved posts" on public.saved_posts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Signed-in members read measured trends" on public.trending_topics for select to authenticated using (measured_at > now() - interval '7 days');

insert into storage.buckets (id, name, public) values ('profile-photos','profile-photos',true),('post-images','post-images',true) on conflict (id) do nothing;
create policy "Users upload own profile photos" on storage.objects for insert to authenticated with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users update own profile photos" on storage.objects for update to authenticated using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users upload own post images" on storage.objects for insert to authenticated with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.comments;