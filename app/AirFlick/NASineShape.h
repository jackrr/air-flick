//
//  NASineShape.h
//  airflick
//
//  Created by Nathan Teetor on 5/6/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "NARoomViewController.h"

@interface NASineShape : UIView

- (id)initWithShape:(NSString *)shape;
- (void)centerShape:(CGPoint)point;
- (void)updateDuration:(float)f;
- (void)changeValue:(UISwipeGestureRecognizerDirection)dir;

@property UIView *shapeView;
@property NARoomViewController *parentClass;

@property NSString *shape;
@property NSString *type;
@property NSNumber *duration;
@property NSString *value;

@property int chordIndex;

@property CGPoint touchStart;
@property NSDate *touchStartTime;
@property CGPoint touchEnd;

@end
