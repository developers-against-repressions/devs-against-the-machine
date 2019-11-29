#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import hashlib


class InvalidFileFormatException(Exception):
    pass

def load_projects():

    project_set  = set() # a set of tuples: ( name, other_info )

    # "x | y | z"
    registry_pattern_1 = r""" ([^|]+)    # team 
                         \|         # separator
                         ([^|]+)    # project description
                         \|         # separator
                         ([^|]+)    # link to project repo
                     """

    # "|x | y | z|"
    registry_pattern_2 = r""" \|         # left-sep
                         ([^|]+)    # team 
                         \|         # mid-separator-1
                         ([^|]+)    # project description
                         \|         # mid-separator-2
                         ([^|]+)    # link to project repo
                         \|         # right-sep
                     """

    ## pattern = re.compile( '%s | %s' % ( sig_pattern_1, sig_pattern_2 ), re.X )

    pattern1 = re.compile( registry_pattern_1, re.VERBOSE )
    pattern2 = re.compile( registry_pattern_2, re.VERBOSE )


    dir = 'projects'
    for basename in os.listdir(dir):
        filename = os.path.join(dir, basename)
        if not os.path.isfile(filename):
            print('Skipping non-file "%s"' % filename)
            continue

        with open(filename) as inp:
            for line in inp:
                line = line.strip()
                if not line:
                    continue

                m = re.match(pattern1, line) or re.match(pattern2, line)                
                if not m :
                    raise InvalidFileFormatException(
                        'File "%s" does not follow the format:\n\t"%s"'
                        % (filename, line)
                    )

                project_set.add((m.group(1).strip(), m.group(2).strip(), m.group(3).strip()))

    project_list = sorted(project_set, key=lambda pair: hashlib.sha256(repr(pair).encode('utf-8')).hexdigest())    
    return project_list


def write_projects(projects, outp):
    for project in projects:
        outp.write('| {:<14} | {:<41} | {:<41} |\n'.format(project[0], project[1], project[2]))


def update_readme(projects):
    with open('pre-readme.md') as inp, open('README.md', 'w') as outp:
        for line in inp:
            if line.strip() == '<!-- Projects -->':
                write_projects(projects, outp)
            else:
                outp.write(line)


def main():
    projects = load_projects()
    update_readme(projects)


if __name__ == '__main__':
    main()
