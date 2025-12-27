# AI Tutor NG

**Master complex topics using local African metaphors.**

AI Tutor NG is an intelligent educational platform designed for Nigerian students. It explains difficult science and art concepts using relatable local contexts (e.g., explaining *Kinetic Energy* using *Danfo Buses* or *Friction* using *Fufu*).

## 💡 The Problem
Generic AI models (like ChatGPT) teach using Western-centric examples. A student in Nigeria, Kenya, or India might struggle to relate to examples involving "baseball" or "snow."

## 🚀 The Solution
This application uses **RAG (Retrieval-Augmented Generation)** to ground AI responses in a specific cultural knowledge base.
1.  **Ingest:** We scrape local news, blogs, and wikis to build a "Cultural Knowledge Base."
2.  **Retrieve:** When a student asks a question, we find relevant local metaphors using Vector Search.
3.  **Generate:** We use **Cohere's Enterprise AI** to weave the academic concept with the local metaphor.

## ✨ Key Features

* **🧠 Contextual Intelligence:** Maps academic concepts to Nigerian daily life using Vector Search (RAG).
* **📜 Griot Mode:** Switches the AI persona to *"Baba Agba"*, an ancient storyteller who teaches via folktales and proverbs.
* **🏆 Gamification (The Naija Ranks):** Earn "Brain Points" (BP) by taking quizzes. Rank up from *JJC* to *Ancestor*.
* **🗣️ Native Voice & Audio:** Automatically detects Nigerian accents on supported devices and plays soothing background piano music for immersion.
* **💾 Smart History:** Auto-saves your learning sessions and allows manual management.
* **📝 Quiz Engine:** Auto-generates multiple-choice questions to test understanding.

---

## 🛠️ Tech Stack

* **Backend:** Python (FastAPI), LangChain, Cohere (LLM & Embeddings).
* **Frontend:** Next.js (React), TypeScript, Tailwind CSS.
* **Database:** Supabase (PostgreSQL + pgvector).
* **Styling:** Lucide Icons, Google Fonts (Outfit, Tinos, JetBrains Mono).

---

## 🚀 Setup Instructions

### 1. Database Setup (Supabase)
You must run the following SQL queries in your **Supabase SQL Editor** to set up the tables:

```sql
-- 1. Enable Vector Extension
create extension if not exists vector;

-- 2. Create Knowledge Table
create table cultural_knowledge (
  id bigint primary key generated always as identity,
  content text,
  region text,
  metadata jsonb,
  embedding vector(384)
);

-- 3. Create Search Function
create or replace function match_cultural_knowledge (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  region text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    cultural_knowledge.id,
    cultural_knowledge.content,
    cultural_knowledge.region,
    1 - (cultural_knowledge.embedding <=> query_embedding) as similarity
  from cultural_knowledge
  where 1 - (cultural_knowledge.embedding <=> query_embedding) > match_threshold
  order by cultural_knowledge.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 4. Create User Profiles (Gamification)
create table public.profiles (
  id uuid references auth.users not null primary key,
  points int default 0
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, points)
  values (new.id, 0);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Create History Table
create table learning_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  subject text not null,
  created_at timestamptz default now()
);

alter table learning_history enable row level security;

create policy "Users can insert own history" on learning_history for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can view own history" on learning_history for select to authenticated using (auth.uid() = user_id);
create policy "Users can delete own history" on learning_history for delete to authenticated using (auth.uid() = user_id);

**[🔴 LIVE DEMO](https://aitutorng.netlify.app/)** | **[📱 WhatsApp Bot](https://wa.me/14155238886?text=join%20stronger-roof)**

## 🏗️ How to Run Locally
1. Clone the repo.
2. Install dependencies: `pip install -r api/requirements.txt` & `npm install`.
3. Set up `.env` with `COHERE_API_KEY` and `SUPABASE_URL`.
4. Run `python -m uvicorn main:app --reload` (Backend).
5. Run `npm run dev` (Frontend).

## 📄 License
MIT

## 🏗️ Architecture

```mermaid
graph LR
    A[User Query] --> B[Next.js Frontend]
    B --> C[FastAPI Backend]
    C --> D{Vector Search}
    D -->|Query| E[(Supabase DB)]
    E -->|Local Context| D
    D --> F[Cohere LLM]
    F -->|Final Explanation| B

## ⚡ Quick Start

### 1. Clone the Repo
```bash
git clone https://github.com/HSSamuel/ai-tutor.git
cd ai-tutor

cd api
pip install -r requirements.txt
python -m uvicorn main:app --reload

cd web
npm install
npm run dev

## 🏗️ Scripts
api/sources.txt
python api/scrape_and_feed.py

🎮 How to Use
Sign Up/In: Log in to save your history and earn Rank Points.

Toggle Modes:
Story Mode (Griot): Receive answers as African folktales.
Pidgin: Switch language to Nigerian Pidgin.
Search: Type a topic (e.g., "Photosynthesis") or use the Mic to speak.
Listen: Click the speaker icon to hear the answer with background music.
Quiz: Click "Quiz Me" after an explanation to test your knowledge and earn points!

Made with ❤️ in Nigeria.