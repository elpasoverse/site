# How to Update Social Media Follower Counts

The social media follower/subscriber counts are displayed on the website in the "Follow the Journey" section.

## To Update the Numbers:

1. Open `index.html` in a text editor
2. Search for the platform ID you want to update:
   - X (Twitter): `id="xFollowerCount"`
   - Instagram: `id="igFollowerCount"`
   - YouTube: `id="ytSubscriberCount"`
   - Discord: `id="discordMemberCount"`

3. You'll find lines that look like:
   ```html
   <span class="stat-number" id="xFollowerCount">X 1.2K</span>
   <span class="stat-number" id="igFollowerCount">IG 850</span>
   <span class="stat-number" id="ytSubscriberCount">YT 420</span>
   <span class="stat-number" id="discordMemberCount">Discord 300+</span>
   ```

4. Change the number while keeping the platform prefix:
   - X followers: `X 1.2K` → `X 2.5K`
   - Instagram: `IG 850` → `IG 1.2K`
   - YouTube: `YT 420` → `YT 650`
   - Discord: `Discord 300+` → `Discord 500+`

5. Save the file

6. Commit and push:
   ```bash
   git add index.html
   git commit -m "Update social media follower counts"
   git push
   ```

## Formatting Tips:

- **Under 1,000:** Just use the number (e.g., `IG 847`, `YT 420`)
- **1,000 - 9,999:** Use K format (e.g., `X 1.2K`, `IG 5.8K`)
- **10,000+:** Use K format (e.g., `X 12.5K`, `YT 45.2K`)
- **Discord:** Can use `+` for growing communities (e.g., `Discord 300+`)

## Current Counts:

- **X (Twitter):** 1.2K
- **Instagram:** 850
- **YouTube:** 420
- **Discord:** 300+

*(Update these when you change them!)*

---

**Note:** Update these about once a week or whenever you gain significant followers/subscribers/members.
