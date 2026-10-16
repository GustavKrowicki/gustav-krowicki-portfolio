# Portfolio problems: ranked list

- Status: Gustav agreed to this order on 2026-10-10. The status column was added on 2026-10-15.
- Data: PostHog, 20 March to 10 October 2026, without the visits of Gustav.
- The repository is public. Thus, this document does not name the companies or the persons that gave feedback.

## 1. Summary

The portfolio must help Gustav to get his first job as a digital product designer.
Applications are the main channel. After the redo, Gustav will send unsolicited applications.
A reviewer decides in seconds. Thus, the first view of each part must tell the story.

The data is small: 199 city sessions. Use the numbers as strong hints, not as proof.

## 2. Evidence

| Item | Value |
| --- | --- |
| City sessions | 199 |
| City sessions on phones | 48% |
| Visits from CV links on a desktop computer | 82% (14 of 17) |
| Visits from LinkedIn on phones | 64% (66 of 103) |
| City visitors that do not select a mode | 22% |
| Session replays of reviewers | 5 (reviewers A to E) |

## 3. Ranked problems

The rank uses three criteria, in this order:

1. The effect on the persons who decide about applications.
2. The strength of the evidence.
3. The fit with the direction: the character of the city in one site with the content.

| Rank | Problem | Who | Evidence | Status in the shell (`/new`) |
| --- | --- | --- | --- | --- |
| 1 | Case studies get seconds | All reviewers | 5 of 5 reviewers stayed 6 to 35 s on each case. | Open. This is content work (section 4). |
| 2 | The city is a one-way door | Reviewers who open the city | A case closes the city. 55% of the sessions from the city to a case do not go back. A return starts from zero. Reviewer A started the city 3 times. | Solved in the shell. The city stays live, a case opens in the panel with Back, and the URL keeps the section and the case (`?s=work&case=lego`), so a link or a return visit opens the same view. |
| 3 | City and classic are two products | All visitors, mainly reviewers | Reviewers use the city as a menu for 19 to 38 s. Then they read in classic. | Partly solved: one page. Open: the character of the city in the design of the panel. |
| 4 | Adventure goes nowhere | Reviewers: all 4 selected Adventure first | 91 starts and 2 completions. "Next Stop" did not seem to respond. Visitors clicked the hint text. | Adventure is not in the shell. Shell step 3 (walk and peek card) and step 5 (achievements) replace it. |
| 5 | The city does not reward exploration | All visitors in the city | A click on scenery gives no result. 7 of 12 stops show only text. | Open: shell steps 3 and 5. The branch `living-city-polish` has click feedback, but it is not merged. |
| 6 | Phones get the weakest version | Mainly visitors from LinkedIn | 48% of city sessions are on phones. 46% of phone sessions do not get to a building (desktop: 26%). 15 of 19 sessions with rage clicks are on phones. | Partly solved: the bottom sheet. Open: touch gestures and tests on real phones. |
| 7 | The front door asks for a decision first | Casual visitors | 22% do not select a mode. Each reviewer selected a mode in 3 to 10 s. | Solved. The shell has no welcome overlay, and Home shows immediately. |
| 8 | The tour is a slideshow | Few visitors | 31 sessions saw stop 1, 20 saw stop 2, 13 saw stop 3, and 3 saw all 14 stops. On phones, "Next" got the most rage clicks. | Removed from the shell. |

The problems are in three groups:

- Problems 1 to 3: the relation between the city and the content. The redo direction is here.
- Problems 4 and 5: the interaction in the city.
- Problems 6 and 7: the reach and the entry.

Mobile stays at rank 6, because applications are the main channel.
If LinkedIn becomes an important channel, mobile moves up to approximately rank 3.

## 4. Problem 1 in detail: case studies get seconds

Each reviewer has two questions:

- "Can he deliver?" This is impact. The first view of a case must show it in seconds.
- "How does he think, and will he grow?" This is reflection. It gives value to the reviewers who stay.

Companies give different weight to the two questions, but they ask both.
Evidence from applications:

- A job advertisement asked for "a significant business impact".
- A final interview praised the "honest reflection on a project that did not go to plan".
- A rejection after a case presentation said that it was "not as clear as we needed it to be".

Problem 1 has three parts:

1. The impact is not visible. The site does not show the verified numbers from the numbers ledger in the job search folder. Before these numbers go on the site, make sure that each number is shareable.
2. Reflections are almost missing. Only the Cate it case has a part about learnings. The LEGO, Valtech, and Viz generator cases have no reflections.
3. The story "a junior who explores and tries things with AI" has no place. The city is the strongest proof of it, but the site does not tell this. The Viz generator case is an AI tool, but it is not in the city.

## 5. Other feedback

An art director (April 2026):

1. A click on a hotspot gives no immediate response.
2. When the avatar arrives at a building, the info box must open without a key press.
3. Some cars move in the wrong direction.
4. The city must show more case work.

The pixel style was also part of the feedback. Gustav keeps the pixel style.
The branch `living-city-polish` solves items 1 and 3, but it is not merged.

A design lead in an interview (October 2026):

- The site shows little visual design and UI. The design lead asked for screenshots, for example of the design system work at LEGO.

## 6. Smaller problems

These problems were found on 2026-10-10 or later:

- The Viz generator case is not in the city.
- A click on the LEGO logo opens a pop-up, but a click on the LEGO building opens the case.
- The building highlight stays on the screen when a visitor stops the tour early.
- The key G shows a debug overlay to visitors.
- The city code uses a pixel font, but the site does not load it.
- Day and night are in the code but not in use. The branch `living-city-polish` uses them.
- The image `erhvervsakademiet_east.png` is missing (status 404). The file in the repository has a space in its name.
- The city tour data shows the Swinburne logo for the University of Melbourne.
- The PDF viewer shows the CV and the recommendation letter as images. Visitors cannot select the text, and the links do not operate. Fixed on the branch for POR-18: the viewer has the text and link layers, and the two letter files have real text.

## 7. Keep this document current

1. After each step of the shell, update the column "Status in the shell".
2. When new data or feedback comes, add it to section 2 or section 5.
3. Do not add the names of companies or persons. The repository is public.
