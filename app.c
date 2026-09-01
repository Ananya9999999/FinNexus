#include<stdio.h>
#include<conio.h>
#include<graphics.h>
#include<dos.h>
#include<stdlib.h>
#include<time.h>
#define MROW 8
#define MCOL 8
#define MINES 5
#define BSIZE 15
union REGS i,o;
//9 for mines
main(){
    int bm= DETECT, bg= DETECT, maxx, maxy, button, x, y, i, j, checkx, checky, nclick;
    int arr[8][8], dot[MINES];
    int count1, count2;
    int row, col;
    time_t t;
    clrscr();
    initgraph(&bm, &bg, )
}