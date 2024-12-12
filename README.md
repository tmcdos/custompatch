# CustomPatch

Patch a buggy NPM package without forking it.

Based on the handy [diff](https://github.com/kpdecker/jsdiff) package (there is a `jsdiff` published on the NPM registry, but it is a bogus one)

## WHY

This tool does what [patch-package](https://www.npmjs.com/package/patch-package) does (or more accurately - should be doing) but without the related issues:

- it works faster, especially when creating the patch
- it never chokes on its own patches
- it does not break if you try to apply a patch more than once (but shows a warning)
- it does not require/depend on GIT
 
When you have made a bugfix for one of your dependencies but the author/maintainers refuse to accept your PR - you do not need to fork the package.
Create a patch and seamlessly apply it locally for all your builds.

## Installation
```bash
npm install custompatch -g
```

## Setup

It operates in exactly the same way as [patch-package](https://www.npmjs.com/package/patch-package) so you can use the same setup if you have it already.
Add the following to your `package.json`

```json
"scripts": 
{
  "prepare": "custompatch"
}
```

## Usage

### Making patches

Open your IDE and make the required changes for the bugfix inside your dependency in `node_modules`. After that run

```bash
custompatch "name-of-the-buggy-package"
```

This will create a folder called `patches` inside your project and a file called `name-of-the-buggy-package#version.patch` in this folder.
This file will be a unified diff between your fixed version of the dependency and its original code.

You can specify more than 1 package on the command-line - but no command-line options are accepted.

### Updating patches

The process is exactly the same as for creating a patch for the first time.

### Applying patches

Run `custompatch` without arguments inside your project folder - it will apply all the patches from `patches` folder. If you want to target specific patches you can use the --patch (-p) flag like so:

```bash
custompatch --patch "name-of-the-buggy-package"
```

### Reversing patches

To reverse all patches you can use the --reverse (-r) flag like so:

```bash
custompatch --reverse
```

To reverse specific patches you can use the --reverse (-r) flag like so:

```bash
custompatch --reverse "name-of-the-buggy-package"
```

## Benefits of patching over forking

- Forks often require extra build steps - and even more often you do not need this overhead
- CustomPatch warns you when a patch was not applied cleanly - so that you can check that your fix is still valid for the new version of dependency
- Keep your patches colocated with the code that depends on them
- Patches can be reviewed as part of your normal review process, forks probably can't

## License

MIT License

Copyright (c) 2024 Nikan Radan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
