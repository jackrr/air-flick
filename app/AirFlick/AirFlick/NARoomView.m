//
//  NARoomView.m
//  airflick
//
//  Created by Nathan Teetor on 5/2/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NARoomView.h"

@implementation NARoomView

- (id)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:frame];
    if (self) {
        // Initialization code
    }
    return self;
}

// Only override drawRect: if you perform custom drawing.
// An empty implementation adversely affects performance during animation.
- (void)drawRect:(CGRect)rect
{
//    NSLog(@"I don't believe this is getting called.");
    
    CGRect bounds = self.frame;
    
    CGPoint center;
    center.x = bounds.origin.x + bounds.size.width/2.0;
    center.y = bounds.origin.y + bounds.size.height/2.0 + 44.0;
    NSLog(@"room view center: %@",NSStringFromCGPoint(center));
    
    float radius = bounds.size.width/3.0;
    
    UIBezierPath *path = [[UIBezierPath alloc] init];
    float pattern[] = {20,20};
    [path setLineDash:pattern count:2 phase:0];
    path.lineWidth = 1.5;
    
    [path addArcWithCenter:center
                    radius:radius
                startAngle:0.0
                  endAngle:M_PI*2.0
                 clockwise:YES];
    
    [path stroke];
}

//-(id)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
//    id hitView = [super hitTest:point withEvent:event];
//    if (hitView == self) return nil;
//    else return hitView;
//}



@end
