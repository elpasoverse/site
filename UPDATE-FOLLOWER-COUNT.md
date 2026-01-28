# How to Update Social Media Follower Counts

The social media follower/subscriber counts are displayed on the website in the "Follow the Journey" section.

## To Update the Numbers:

1. Open `index.html` in a text editor
2. Search for the platform ID you want to update:
   - X (Twitter): `id="xFollowerCount"`
   - Instagram: `id="igFollowerCount"`
   - YouTube: `id="ytSubscriberCount"`
   - TikTok: `id="tiktokFollowerCount"`
   - Discord: `id="discordMemberCount"`

3. You'll find lines that look like:
   ```html
   <span id="xFollowerCount" style="font-weight: 600;">685</span>
   <span id="igFollowerCount" style="font-weight: 600;">243</span>
   <span id="ytSubscriberCount" style="font-weight: 600;">46</span>
   <span id="tiktokFollowerCount" style="font-weight: 600;">47</span>
   <span id="discordMemberCount" style="font-weight: 600;">129</span>
   ```

4. Change the number:
   - X followers: `685` → `750`
   - Instagram: `243` → `300`
   - YouTube: `46` → `100`
   - TikTok: `47` → `75`
   - Discord: `129` → `200`

5. Save the file

6. Commit and push:
   ```bash
   git add index.html
   git commit -m "Update social media follower counts"
   git push
   ```

## Formatting Tips:

- **Under 1,000:** Just use the number (e.g., `243`, `47`)
- **1,000 - 9,999:** Use K format (e.g., `1.2K`, `5.8K`)
- **10,000+:** Use K format (e.g., `12.5K`, `45.2K`)
- All platforms display the same way: just the number with "followers", "subscribers", or "members" added by the HTML

## Current Counts:

- **X (Twitter):** 685
- **Instagram:** 243
- **YouTube:** 46
- **TikTok:** 47
- **Discord:** 129

*(Update these when you change them!)*

---

**Note:** Update these about once a week or whenever you gain significant followers/subscribers/members.
