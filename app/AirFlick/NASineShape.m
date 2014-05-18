//
//  NASineShape.m
//  airflick
//
//  Created by Nathan Teetor on 5/6/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NASineShape.h"


@implementation NASineShape

- (id)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:frame];
    if (self) {
        // Initialization code
        
        UITapGestureRecognizer *tapRecognizer = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(doubleTap:)];
        tapRecognizer.numberOfTapsRequired = 2;
        [self addGestureRecognizer:tapRecognizer];
        
        UIPanGestureRecognizer *panRecognizer = [[UIPanGestureRecognizer alloc]
                                                 initWithTarget:self
                                                 action:@selector(moveShape:)];
        [self addGestureRecognizer:panRecognizer];
        
        self.backgroundColor = [UIColor colorWithWhite:1.0 alpha:0.0];
        
        self.duration = [[NSNumber alloc] initWithInt:10000];
    }
    return self;
}

- (id)initWithShape:(NSString *)shape
{
    self = [self initWithFrame:CGRectMake(200,200,120,120)];
    if (self) {
        self.shape = shape;
        
        UILabel *valueLabel = [[UILabel alloc]
                               initWithFrame:CGRectMake(self.bounds.size.width/2.0,
                                                        self.bounds.size.height/2.0,
                                                        40, 40)];
        valueLabel.textAlignment = NSTextAlignmentCenter;
        valueLabel.center = CGPointMake(self.bounds.size.width/2.0,
                                        self.bounds.size.height/2.0);
        valueLabel.tag = 33;

        if ([shape isEqualToString:@"circle"]) {
            self.type = @"volume";
            self.value = @"1";
            valueLabel.text = @"x1";
            
        } else if ([shape isEqualToString:@"diamond"]){
            self.type = @"pitch";
            self.value = @"C";
            valueLabel.text = self.value;
            
            //[self addSubview:valueLabel];
            
        } else if ([shape isEqualToString:@"square"]) {
            self.type = @"chord";

            self.value = [self getChord:self.chordIndex];
            valueLabel.text = self.value;
            
            //[self addSubview:valueLabel];
            
        } else {
         [NSException raise:@"ShapeNotFoundException"
                     format:@"Shape initializer could not parse shape param"];
        }
        
        [self addSubview:valueLabel];
    }
    return self;
}

- (void)centerShape:(CGPoint)center
{
    self.center = center;
}

- (void)testSwipe:(UISwipeGestureRecognizer *) sr
{
    NSLog(@"swipe up detected");
}

- (void)doubleTap:(UITapGestureRecognizer *)tr
{
    CGRect newFrame = self.frame;
    CGPoint oldCenter = self.center;
    
    newFrame.size.width = 120;
    newFrame.size.height = 120;
    [self setFrame:newFrame];
    self.center = oldCenter;

    self.duration = [[NSNumber alloc] initWithFloat:1000*10];
    NSLog(@"duration: %@",self.duration);
}

- (void)changeValue:(UISwipeGestureRecognizerDirection)dir
{
    int change = 0;
    if (dir == UISwipeGestureRecognizerDirectionUp){
        change = 1;
    } else if (dir == UISwipeGestureRecognizerDirectionDown){
        change = -1;
    }
    
    if ([self.shape isEqualToString:@"diamond"]){
        
        UILabel *valueLabel = (UILabel *)[self viewWithTag:33];
        
        int value = [self.value characterAtIndex:0]-65;
        self.value = [NSString stringWithFormat:@"%c",((value+change+7)%7)+65];
        valueLabel.text = self.value;
    }
    else if ([self.shape isEqualToString:@"circle"]){
        UILabel *volumeLabel = (UILabel *)[self viewWithTag:33];

        int vol = [[self.value substringFromIndex:1] doubleValue];
        vol = vol + (change*1.0/10);
        vol = MIN(2, vol);
        vol = MAX(0, vol);
        
        self.value = [NSString stringWithFormat:@"x%d",vol];
        volumeLabel.text = self.value;
    }
    else if ([self.shape isEqualToString:@"square"]){
        UILabel *chordLabel = (UILabel *)[self viewWithTag:33];
        self.value = [self getChord:change];
        NSLog(@"self.value: %@",self.value);
        chordLabel.text = self.value;
    }
    
}

- (void)moveShape:(UIPanGestureRecognizer *)pr
{
    if (pr.state == UIGestureRecognizerStateEnded){
        self.touchEnd = [pr locationInView:self.superview];
        
        float height = self.superview.bounds.size.height;
        float width = self.superview.bounds.size.width;
        
        float dx = -1*(self.touchStart.x - self.touchEnd.x);
        float dy = -1*(self.touchStart.y - self.touchEnd.y);
        
        float normalize = [self distFormula:self.touchStart :self.touchEnd];
        float r = 300.0+self.bounds.size.height; // height should equal width
        
        CGPoint finalPoint = CGPointMake(self.touchStart.x+(r*dx/normalize),
                                         self.touchStart.y+(r*dy/normalize));
        
        CGFloat timeElapsed = [[NSDate date] timeIntervalSinceDate:self.touchStartTime];
        CGFloat velocity = [self distFormula:self.touchStart :self.touchEnd]/timeElapsed;
        
        float duration = [self distFormula:self.touchEnd :finalPoint]/velocity;
        
        NSLog(@"about to send shape to screen");
        NSDictionary *closestScreen = [self.parentClass closestScreenToPoint:finalPoint];
        
        [self.parentClass sendShapeToScreen:[self shapeAsDict]
                                           :closestScreen];
        
        [UIView animateWithDuration:duration
                              delay:0.0
                            options:UIViewAnimationOptionCurveEaseOut
                         animations:^{
                             self.center = finalPoint;
                         }
                         completion:^(BOOL finished) {
                             self.superview.userInteractionEnabled = YES;
                             self.center = CGPointMake(width/2.0,
                                                       height/2.0+44.0);
                         }];
    }
    else if (pr.state == UIGestureRecognizerStateBegan) {
        self.touchStart = [pr locationInView:self.superview];
        self.touchStartTime = [NSDate date];
        
        self.superview.userInteractionEnabled = NO;
    } else {
        CGPoint point = [pr locationInView:self.superview];
        self.center = point;
    }
}

- (NSDictionary *)shapeAsDict
{
    if ([self.type isEqualToString:@"chord"]) {
        return @{ @"type":self.type,
                  @"duration":self.duration,
                  @"value":self.value };
    } else if ([self.type isEqualToString:@"pitch"]){
        return @{ @"type":self.type,
                  @"duration":self.duration,
                  @"value":self.value };
    } else if ([self.type isEqualToString:@"volume"]){
        return @{ @"type":self.type,
                  @"duration":self.duration,
                  @"value":self.value };
    }
    NSLog(@"WHOOPS!");
    return @{};
}

- (NSString *)getChord:(int)change
{
    NSLog(@"change: %i",change);
    NSArray *chords = @[@"maj",@"maj7",@"min",@"dom7",@"min7"];
    self.chordIndex = (self.chordIndex + change + chords.count) % chords.count;
    NSLog(@"chordIndex: %i",self.chordIndex);
    NSString *ret = [chords objectAtIndex:self.chordIndex];
    NSLog(@"new chord: %@",ret);
    return ret;
}

// Only override drawRect: if you perform custom drawing.
// An empty implementation adversely affects performance during animation.
- (void)drawRect:(CGRect)rect
{
    float offset = 20.0;
    CGRect smallerRect = CGRectMake(rect.origin.x+(offset/2.0), rect.origin.y+(offset/2.0),
                             rect.size.width-offset, rect.size.height-offset);
    CGContextRef ctx = UIGraphicsGetCurrentContext();

    if ([self.shape isEqualToString:@"triangle"]){
        CGContextBeginPath(ctx);
        CGContextMoveToPoint(ctx, CGRectGetMinX(smallerRect), CGRectGetMinY(smallerRect));  // top left
        CGContextAddLineToPoint(ctx, CGRectGetMinX(smallerRect), CGRectGetMaxY(smallerRect));  // mid right
        CGContextAddLineToPoint(ctx, CGRectGetMaxX(smallerRect), CGRectGetMidY(smallerRect));  // bottom left
        CGContextClosePath(ctx);
        
        CGContextSetRGBFillColor(ctx, 0, 1, 0, 1);
        CGContextFillPath(ctx);
    } else if ([self.shape isEqualToString:@"square"]){
        CGContextAddRect(ctx, smallerRect);
        CGContextSetRGBFillColor(ctx, 1, 0, 0, 1);
        CGContextFillPath(ctx);
    } else if ([self.shape isEqualToString:@"circle"]){
        CGContextAddEllipseInRect(ctx, smallerRect);
        CGContextSetRGBFillColor(ctx, 0, 0, 1, 1);
        CGContextFillPath(ctx);
    } else if ([self.shape isEqualToString:@"diamond"]){
        CGContextBeginPath(ctx);
        // top center
        CGContextMoveToPoint(ctx, CGRectGetMidX(smallerRect), CGRectGetMinY(smallerRect));
        // right
        CGContextAddLineToPoint(ctx, CGRectGetMaxX(smallerRect), CGRectGetMidY(smallerRect));
        // bottom center
        CGContextAddLineToPoint(ctx, CGRectGetMidX(smallerRect), CGRectGetMaxY(smallerRect));
        // left
        CGContextAddLineToPoint(ctx, CGRectGetMinX(smallerRect), CGRectGetMidY(smallerRect));
        CGContextClosePath(ctx);
        
        CGContextSetRGBFillColor(ctx, 1, 0, 1, 1);
        CGContextFillPath(ctx);
    }
}

- (CGFloat)distFormula:(CGPoint)p1 :(CGPoint)p2
{
    CGFloat dx = p1.x-p2.x;
    CGFloat dy = p1.y-p2.y;
    return sqrt((dx*dx)+(dy*dy));
}

- (CGFloat)slopeFormula:(CGPoint)p1 :(CGPoint)p2
{
    CGFloat dx = p1.x-p2.x;
    CGFloat dy = p1.y-p2.y;
    return dx/dy;
}

- (void)updateDuration:(float)f
{
    self.duration = [[NSNumber alloc] initWithFloat:f];
}


@end
