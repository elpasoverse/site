# How to Update Total Community Count

The total community count is displayed on the website in the "Follow the Journey" section as a combined total of all social media followers.

## To Update the Total:

1. **Calculate the new total** by adding up all platform followers:
   - X (Twitter): Currently 685
   - Instagram: Currently 243
   - YouTube: Currently 46
   - TikTok: Currently 47
   - Discord: Currently 129
   - **Total: 1,150**

2. Open `index.html` in a text editor

3. Search for: `1,150+`

4. You'll find a line that looks like:
   ```html
   <div style="font-size: 3rem; font-weight: 700; color: #3A2820; font-family: 'Playfair Display', Georgia, serif;">1,150+</div>
   ```

5. Replace `1,150+` with your new total (keep the `+` at the end)

6. Save the file

7. Commit and push:
   ```bash
   git add index.html
   git commit -m "Update community count"
   git push
   ```

## Formatting Tips:

- **Under 1,000:** Just use the number (e.g., `850+`)
- **1,000 - 9,999:** Use comma format (e.g., `1,150+`, `5,800+`)
- **10,000+:** Use K format (e.g., `12.5K+`, `45.2K+`)
- Always keep the `+` at the end to indicate growth

## Current Individual Platform Counts:

- **X (Twitter):** 685
- **Instagram:** 243
- **YouTube:** 46
- **TikTok:** 47
- **Discord:** 129
- **TOTAL:** 1,150

*(Track individual platform counts here, but only the total displays on the website)*

---

**Note:** Update the total about once a week or whenever you gain significant followers across all platforms.
