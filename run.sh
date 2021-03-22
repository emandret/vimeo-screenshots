#!/bin/bash

while read -r line; do
  node browser.js $line
done < list.txt
