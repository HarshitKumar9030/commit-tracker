# Team workflow

## Create your team

Create a group with a name, repository, your own name and GitHub username, and an access code. Start with just your profile or enable the four-person starter setup. The preset preserves existing names and GitHub identities, assigns responsibilities, and adds generic placeholders only for missing roles. Rename those placeholders before inviting teammates.

The starter responsibilities are lead developer, second developer, code maintainer, and presenter, plus a separate shared Canvas User. Teams can instead use any arrangement of up to 20 profiles. Only eligible code members receive automatic reviews. Authors are excluded unless self-review is explicitly enabled. If nobody is eligible, commits stay unassigned.

## Follow a change

1. Sync or receive a GitHub push webhook.
2. An assigned developer inspects the diff and records an approval or change request.
3. The code maintainer checks detected symbols and saves a Markdown explanation.
4. The presenter reads those notes, rehearses the suggested outline, and exports the recap.
5. Any teammate can open the shared canvas to explain architecture or ideas.

## Access model

The team creator manages membership, repository settings, and routing. The assigned reviewer submits the review. The code maintainer and creator edit code-index records. Every member can draw and share Drive links; file entries can be managed by their sharer or creator.

A team code is shared access for a trusted group. Anyone who knows it can select a listed profile. It is not a personal password, GitHub OAuth, or proof of individual identity. New-team codes are salted and hashed. Sessions are signed HTTP-only cookies. Removing a profile revokes its API access while retaining completed history.

## Canvas and files

Canvas User is a tablet shortcut to the same board every teammate can use. Stylus pressure depends on device support. Boards persist in MongoDB, with offline queues on the device, undo/redo, read-only history, and PNG/SVG export. Each board supports 2,000 strokes of up to 512 points; each team supports 100 boards. SVG export uses uniform stroke widths.

Files are Google Drive links, not copied uploads. Give teammates access in Drive, then paste the file or folder sharing URL into Relay. A shared folder with Editor access provides a common upload location in Drive. Relay never changes Drive permissions or deletes the original file. Archive/restore affects the Relay entry only; up to 500 entries including archived ones are supported. Private embeds may require opening the file directly in Drive.
