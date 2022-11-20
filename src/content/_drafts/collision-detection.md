## Acronyms:

- CCD: Continuous Collision Detection
- OBB: Oriented Bounding Box
- AABB: Axis Aligned Bounding Box
- GJK: Gilbert Johnson Keerthi Algorithm
- MPR: Minkowski Portal Refinement
- EPA: Expanding Polytope Algorithm
- SAT: Separating Axis Theorem

### List of Jargon: 
- Polytope
- Minkowski Difference/Sum
- Support Point
- Bounding Box

## Problems: 

- *Why* should you, the reader, care? Why is this article interesting/worth reading?

- Vastness of this article 
    => if you take on math pre-requisites + all these problems + demos + different algorithms + code explanations
    => this will take like an hour or more to read (not to mention 100+ or so hours to write to make it good) 
    => Question: What could be cut out? Should I cut out stuff? Should this be more than 1 article? How should it be split up?

- How to handle different levels of "knowledge" on the readers side? 

- Some of this stuff is necessarily quite mathematics heavy 
    => probably need some linear algebra primers?
    => What other knowledge is necessary in advance? 

### Technical Problems: 
- 2D vs 3D => go with 2D in the beginning...
- Convex vs. Concave Shapes => side branch => triangulation methods of (concave) polygons (whole separate article... Ear Clipping, Monotone Polygon Triangulation, )
- What about fast moving polygons? => Motivate CCD.
- Some of this could be beautifully wrapped into a TS library in the end. For re-use.
- Allow user to "draw" arbitrary shaped polygons (non-curved ones)

## Little things to share:
- Share con(cave) mnemonic
