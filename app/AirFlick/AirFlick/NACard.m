//
//  NACard.m
//  airflick
//
//  Created by Nathan Teetor on 4/2/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NACard.h"

@implementation NACard

- (instancetype)initWithParentView:(UIView *)parentView {
    self = [super init];
    
    if (self){
        UIColor *magenta = [UIColor colorWithRed:255/255.0f green:0/255.0f blue:255/255.0f alpha:1.0f];
        UIColor *cyan = [UIColor colorWithRed:0/255.0f green:255/255.0f blue:255/255.0f alpha:1.0f];
        UIColor *yellow = [UIColor colorWithRed:255/255.0f green:255/255.0f blue:0/255.0f alpha:1.0f];
        
        UIColor *COLORS[] = { magenta, cyan, yellow };
        NSString *TYPES[] = { @"magenta", @"cyan", @"yellow" };
        NSUInteger i = arc4random_uniform(3);
        NSLog(@"i = %d",i);
        
        _color = COLORS[i];
        _typeColor = TYPES[i];
        
        _parentView = parentView;
        
        NSInteger x = _parentView.bounds.size.width/4;
        NSInteger y = _parentView.bounds.size.height/4;
        CGRect frame = CGRectMake(x,y,x*2,y*2);
        _view = [[UIView alloc] initWithFrame:frame];
        _view.backgroundColor = _color;
        _view.tag = 3;

    }
    
    return self;
}

- (void)display {
    // remove old card
    [[_parentView viewWithTag:3] removeFromSuperview];
    
    [_parentView insertSubview:_view atIndex:0];
}

- (NSDictionary *)convertToDict {
    return [NSDictionary dictionaryWithObjectsAndKeys:_color,@"color", nil];
}

- (void)transitionLeft {
    CATransition *animation = [CATransition animation];
    [animation setDelegate:self];
    [animation setType:kCATransitionPush];
    [animation setSubtype:kCATransitionFromRight];
    [animation setDuration:0.50];
    [animation setTimingFunction:
     [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut]];
    [_view.layer addAnimation:animation forKey:kCATransition];
}

- (void)transitionRight {
    // yup
}

- (void)transitionUp {
    // yup
}

@end
