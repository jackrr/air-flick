//
//  NACard.h
//  airflick
//
//  Created by Nathan Teetor on 4/2/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface NACard : NSObject

@property UIView *parentView;
@property UIColor *color;
@property NSString *typeColor;
@property UIView *view;

- (instancetype)initWithParentView:(UIView *)parentView;
- (void)display;
- (NSDictionary *)convertToDict;

// transition functions
- (void)transitionLeft;
- (void)transitionRight;
- (void)transitionUp;

@end
