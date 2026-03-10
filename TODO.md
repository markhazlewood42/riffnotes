### Before alpha

- Finish implementing the example song for all users.
- Add a "duplicate" action to document toolbar. Allow example song to be duplicated.
- Look into database architecture - songs should not be shared across users!
- Reduce line height of right text annotations to avoid crowding
- Right annotation deletion via button, not clicking on the item.
- Make it harder to accidentally delete things. Require two steps.
- UNDO!!!!!!
- Don't save a song until it actually has content. Avoid a bunch of empty songs.

### Later

- Map pasted images to users. Make ALL song data user indexed, actually.
- Remove image from storage bucket on deletion.
- Improve right annotation rendering to support better vertical stacking and avoid overlapping
  - Redesign connectors to bend when needed
- Multi-user collaboration??
- Improve rendering of longer staff images

### Big ideas

- Embedded musical notation editor to create staff annotations, instead of just pasting images.
