# RecallIT Test Suite (User Interaction Level)

## Feature 1: Authentication (Login Flow)

### Test Case #1: Login with valid credentials
a. Enter valid username/email  
b. Enter valid password  
c. Press login button  
Expected Result: User logs in successfully and reaches the main study area.

### Test Case #2: Login with invalid password
a. Enter valid username/email  
b. Enter invalid password  
c. Press login button  
Expected Result: Login is rejected and user sees an error message.

### Test Case #3: Login with empty fields
a. Keep username/email empty  
b. Keep password empty  
c. Press login button  
Expected Result: Form validation blocks submission and prompts user to fill required fields.

### Test Case #4: Register new user with valid data
a. Switch to register mode  
b. Enter valid name, email, and password  
c. Press create account button  
Expected Result: Account is created and user is logged into the main study area.

### Test Case #5: Register with existing email
a. Switch to register mode  
b. Enter an email that already exists  
c. Press create account button  
Expected Result: Registration is rejected with duplicate-account message.

### Test Case #6: Login with invalid email format
a. Enter invalid email format  
b. Enter any password  
c. Press login button  
Expected Result: Form validation prevents submission or server rejects request.

### Test Case #7: Logout flow
a. Login successfully  
b. Press logout button  
c. Try opening protected study actions  
Expected Result: Session ends and user is returned to auth screen.

### Test Case #8: Session persistence after refresh
a. Login successfully  
b. Refresh browser page  
c. Wait for app initialization  
Expected Result: User remains logged in and previous session is restored.

---

## Feature 2: Study Session Behavior (Filters + Review Rating)

### Test Case #9: Start study with default behavior
a. Select a deck  
b. Press start study without applying extra filters  
c. Reveal answer and rate card  
Expected Result: A due card is shown and rating action is accepted.

### Test Case #10: Study with messy tags input
a. Enter tags with mixed case and duplicates (example: `Cpp, cpp, Memory`)  
b. Apply filters  
c. Start study  
Expected Result: App still loads matching cards correctly (tags handled consistently).

### Test Case #11: Rate card as Easy
a. Open a due card  
b. Reveal answer  
c. Press `Easy`  
Expected Result: Review is saved, XP is awarded, and next-card/next-schedule behavior updates.

### Test Case #12: Rate card as Good/Hard/Again
a. Open a due card  
b. Reveal answer  
c. Press one of: `Good`, `Hard`, or `Again`  
Expected Result: Review is saved and progression reflects selected difficulty.

### Test Case #13: Toggle answer visibility
a. Open a due card  
b. Click/tap to reveal answer  
c. Click/tap again to hide answer  
Expected Result: Card flips between question and answer without losing card state.

### Test Case #14: Scope filter set to Overdue
a. Select due scope as `Overdue`  
b. Start study  
c. Observe returned cards  
Expected Result: Returned cards are from overdue pool only.

### Test Case #15: Scope filter set to Today
a. Select due scope as `Today`  
b. Start study  
c. Observe returned cards  
Expected Result: Returned cards are only those due within current day range.

### Test Case #16: Weak-only filter enabled
a. Enable `Weak only` checkbox  
b. Start study  
c. Review first few returned cards  
Expected Result: Returned cards are from weak-card set and non-weak cards are excluded.

### Test Case #17: Switch mode to Cram
a. Set study mode to `Cram`  
b. Start study  
c. Continue multiple next cards  
Expected Result: Queue includes urgent and near-term cards as per cram behavior.

### Test Case #18: Switch mode to Exam
a. Set study mode to `Exam`  
b. Start study  
c. Continue multiple next cards  
Expected Result: Queue prioritizes unstable/risky cards per exam behavior.

### Test Case #19: No cards match selected filters
a. Apply very restrictive filters (tags + scope + weak-only)  
b. Start study  
c. Wait for response  
Expected Result: User sees no-matching-cards state instead of app error.

### Test Case #20: Add card then resume study
a. Open add-card flow and create a valid card  
b. Return to study view  
c. Fetch next card  
Expected Result: New card is available for study according to active filters.

---

## Feature 3: Progress & Analytics (Daily Tracking + Heatmap)

### Test Case #21: Daily review count updates
a. Complete multiple reviews in one day  
b. Open metrics panel  
c. Check daily progress values  
Expected Result: Reviewed count increases correctly for the current day.

### Test Case #22: Goal progress visibility
a. Set a daily goal  
b. Complete reviews toward that goal  
c. Refresh/open metrics  
Expected Result: Remaining count and goal completion status update correctly.

### Test Case #23: Heatmap range and day grouping
a. Open analytics/heatmap view  
b. Inspect displayed date range  
c. Verify review activity appears on correct day cells  
Expected Result: Heatmap spans the expected day window and groups activity by day consistently.

### Test Case #24: Daily goal reached state
a. Set a small daily goal (example: 2)  
b. Complete enough reviews to hit the goal  
c. Open progress section  
Expected Result: Goal-met status becomes true and remaining count becomes zero.

### Test Case #25: XP total increases after reviews
a. Note current XP total  
b. Complete one or more rated reviews  
c. Recheck XP in UI/metrics  
Expected Result: Total XP increases by expected reward amounts.

### Test Case #26: Streak continuation on consecutive days
a. Meet daily goal on day 1  
b. Meet daily goal again on day 2  
c. Open metrics/stats  
Expected Result: Current streak increments by one and best streak updates if needed.

### Test Case #27: Forecast data visibility
a. Open metrics panel  
b. Locate due forecast section  
c. Inspect upcoming buckets  
Expected Result: Forecast list is visible with non-negative due counts.

### Test Case #28: Metrics reload behavior
a. Open metrics panel  
b. Trigger refresh action  
c. Observe panel state  
Expected Result: Metrics reload successfully without losing current user context.

### Test Case #29: Settings update affects progress display
a. Change daily goal in settings  
b. Save settings  
c. Re-open progress/metrics  
Expected Result: Progress calculations reflect the updated daily goal.
