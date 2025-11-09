# Question API Research for Cooped Extension

## Summary
Research conducted on November 7, 2025 to identify external APIs for scaling beyond hardcoded challenge questions.

---

## Recommended Solution: **Open Trivia Database (OpenTDB)**

### Why OpenTDB is Best for Cooped:
1. **Completely Free** - No API key required, no rate limits beyond 1 request per 5 seconds
2. **Fill-in-the-Blank Compatible** - Returns plain text questions and answers (not just multiple choice)
3. **Perfect Categories** - Aligns with our needs: General Knowledge, History, Science, Geography, etc.
4. **Session Tokens** - Built-in duplicate prevention (tokens expire after 6 hours of inactivity)
5. **Difficulty Levels** - Easy, Medium, Hard (matches our existing system)
6. **Large Database** - 4,000+ verified questions and growing
7. **Open License** - CC BY-SA 4.0 (user-contributed, community-driven)

### API Endpoints

**Base URL:** `https://opentdb.com/`

**Get Questions:**
```
GET https://opentdb.com/api.php?amount=10&category=9&difficulty=easy&type=multiple
```

**Parameters:**
- `amount`: 1-50 (max 50 questions per request)
- `category`: Integer ID (9-32, see category list below)
- `difficulty`: `easy`, `medium`, `hard`
- `type`: `multiple` (multiple choice) or `boolean` (true/false)
- `encode`: `url3986` or `base64` (optional, for special characters)

**Get Session Token (recommended for preventing duplicates):**
```
GET https://opentdb.com/api_token.php?command=request
Response: {"response_code":0,"response_message":"Token Generated Successfully!","token":"UNIQUE_TOKEN_HERE"}
```

**Use Session Token:**
```
GET https://opentdb.com/api.php?amount=10&token=YOUR_TOKEN_HERE
```

**Reset Token (when all questions exhausted):**
```
GET https://opentdb.com/api_token.php?command=reset&token=YOUR_TOKEN_HERE
```

### Available Categories

| ID | Category | Relevant for Cooped? |
|----|----------|---------------------|
| 9 | General Knowledge | ✅ YES - Primary |
| 10 | Entertainment: Books | ✅ YES - Vocabulary |
| 11 | Entertainment: Film | ⚠️ Maybe |
| 12 | Entertainment: Music | ⚠️ Maybe |
| 13 | Entertainment: Musicals & Theatres | ❌ No |
| 14 | Entertainment: Television | ⚠️ Maybe |
| 15 | Entertainment: Video Games | ❌ No |
| 16 | Entertainment: Board Games | ❌ No |
| 17 | Science & Nature | ✅ YES |
| 18 | Science: Computers | ✅ YES |
| 19 | Science: Mathematics | ✅ YES - Primary |
| 20 | Mythology | ✅ YES |
| 21 | Sports | ⚠️ Maybe |
| 22 | Geography | ✅ YES - Primary |
| 23 | History | ✅ YES - Primary |
| 24 | Politics | ✅ YES |
| 25 | Art | ✅ YES |
| 26 | Celebrities | ❌ No |
| 27 | Animals | ✅ YES |
| 28 | Vehicles | ❌ No |
| 29 | Entertainment: Comics | ❌ No |
| 30 | Science: Gadgets | ⚠️ Maybe |
| 31 | Entertainment: Japanese Anime & Manga | ❌ No |
| 32 | Entertainment: Cartoon & Animations | ❌ No |

### Response Format

```json
{
  "response_code": 0,
  "results": [
    {
      "category": "General Knowledge",
      "type": "multiple",
      "difficulty": "easy",
      "question": "What is the capital of France?",
      "correct_answer": "Paris",
      "incorrect_answers": ["London", "Berlin", "Madrid"]
    }
  ]
}
```

### Response Codes
- `0` - Success
- `1` - No Results (not enough questions for criteria)
- `2` - Invalid Parameter
- `3` - Token Not Found
- `4` - Token Empty (all questions retrieved, need to reset)
- `5` - Rate Limit (5 seconds between requests)

### Rate Limits
- **1 request per 5 seconds per IP**
- Session tokens deleted after 6 hours of inactivity

---

## Alternative: The Trivia API

**URL:** https://the-trivia-api.com

### Pros:
- Larger question database
- Cleaner modern API design
- More detailed tagging system
- ISO region support

### Cons:
- ❌ **Multiple choice only** - Not suitable for fill-in-the-blank format
- ❌ **Strict rate limits** - Max 5 questions per request (vs 50 for OpenTDB)
- ❌ **Subscription required** for advanced features (search, session management)
- ❌ Less mature for educational use

**Verdict:** Not recommended for Cooped due to multiple-choice-only format.

---

## Alternative: API Ninjas Trivia API

**URL:** https://api-ninjas.com/api/trivia

### Pros:
- Simple API
- General trivia questions

### Cons:
- ❌ Requires API key (registration required)
- ❌ Only 100 questions on free tier
- ❌ No difficulty levels
- ❌ No category filtering

**Verdict:** Too limited for our needs.

---

## Implementation Strategy for Cooped

### Phase 1: Hybrid Approach (Recommended for MVP)
**Use both hardcoded questions AND OpenTDB API**

**Why?**
1. **Offline Support** - Hardcoded questions work without internet
2. **Instant Response** - No API latency for cached questions
3. **Reliability** - Fallback if API is down or rate-limited
4. **Cost-Free** - No infrastructure costs
5. **Custom Content** - Can add Cooped-specific questions (e.g., chicken facts!)

**Implementation:**
```javascript
// Challenge fetch priority:
1. Check cache for unused questions (stored locally)
2. If cache < 10 questions, fetch 50 from OpenTDB in background
3. Store in local cache with metadata (category, difficulty, used/unused)
4. Rotate between API and hardcoded questions (e.g., 70% API, 30% hardcoded)
5. Use session token to prevent duplicates
```

### Phase 2: Smart Question Management
- Pre-fetch questions during idle time (not when user is actively browsing)
- Store 50-100 questions locally at all times
- Track which questions user has seen (localStorage)
- Implement spaced repetition (show missed questions again after X days)
- Add user-reported question quality (thumbs up/down)

### Phase 3: Future Expansion (Post-MVP)
- **Custom Question Submission** - Let users create questions for community
- **Question Marketplace** - Premium curated question packs (e.g., SAT prep, coding challenges)
- **Partner with Educational Platforms** - Coursera, Khan Academy integration
- **AI-Generated Questions** - Use GPT/Claude API to generate personalized questions based on user interests
- **Language Support** - Multi-language questions via translation APIs

---

## Category Mapping for Cooped

| Cooped Category | OpenTDB Categories | Description |
|----------------|-------------------|-------------|
| **General Knowledge** | 9 (General Knowledge) | Mix of all topics, broad knowledge |
| **History** | 23 (History), 20 (Mythology), 24 (Politics) | Historical events, figures, dates |
| **Math** | 19 (Science: Mathematics) + Hardcoded | Math problems, equations, logic |
| **Vocabulary** | 10 (Books), 25 (Art) + Hardcoded | Word definitions, synonyms, language |
| **Science** | 17 (Science & Nature), 18 (Computers), 27 (Animals) | Scientific facts and concepts |
| **Geography** | 22 (Geography) | Countries, capitals, landmarks |

---

## Technical Implementation Notes

### Storage Schema
```javascript
// Add to types.js
export const QuestionCache = {
  questions: [
    {
      id: string,
      source: 'opentdb' | 'hardcoded' | 'user',
      category: string,
      difficulty: 'easy' | 'medium' | 'hard',
      question: string,
      answer: string,
      incorrectAnswers: string[], // For hints/distractors
      used: boolean,
      lastShown: timestamp,
      userRating: number // 0-5 stars
    }
  ],
  sessionToken: string, // OpenTDB session token
  tokenExpiry: timestamp,
  lastFetch: timestamp
};
```

### API Service (New File)
```javascript
// src/services/question-api.js
export class QuestionAPI {
  static BASE_URL = 'https://opentdb.com';

  async fetchQuestions(category, difficulty, amount = 50) {
    // Fetch from OpenTDB with session token
    // Handle rate limiting (5 sec between requests)
    // Parse HTML entities in questions/answers
    // Cache locally
  }

  async getSessionToken() {
    // Request new session token if expired
  }

  async getCachedQuestion(category, difficulty) {
    // Get from local cache first
    // Fallback to hardcoded if cache empty
  }
}
```

### HTML Entity Parsing
OpenTDB returns HTML entities (e.g., `&quot;`, `&#039;`) - must decode before displaying:
```javascript
function decodeHTML(text) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}
```

---

## Metrics to Track

For future optimization:
- Question source distribution (API vs hardcoded)
- User success rate by category
- Average response time by difficulty
- Most skipped question categories
- API response times and failure rates
- Cache hit/miss ratio

---

## Final Recommendation

**Start with OpenTDB for MVP** with this approach:

1. ✅ Keep existing hardcoded questions (challenges/challenge-bank.js)
2. ✅ Add OpenTDB API integration for scalability
3. ✅ Implement local question caching (50-100 questions)
4. ✅ Use session tokens to prevent duplicates
5. ✅ Fallback to hardcoded questions if API unavailable
6. ✅ Map OpenTDB categories to Cooped categories
7. ⏳ Later: Add custom question submission (Phase 2)
8. ⏳ Later: Add AI-generated questions (Phase 3)

**Estimated Implementation Time:** 4-6 hours for full API integration + caching

**Cost:** $0 (completely free, no API keys, no rate limits beyond 1 req/5 sec)

---

*Last Updated: November 7, 2025*
